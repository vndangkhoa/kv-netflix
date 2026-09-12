package scraper

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"

	"streamflow-backend/internal/models"

	"github.com/PuerkitoBio/goquery"
)

const RophimBaseURL = "https://rophim10.dev"

type ActorScraper struct {
	client                *http.Client
	mu                    sync.RWMutex
	actorsCache           []models.Actor
	actorsCacheTime       time.Time
	actorDetailsCache     map[string]*models.ActorDetail
	actorDetailsCacheTime map[string]time.Time
}

func NewActorScraper() *ActorScraper {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	s := &ActorScraper{
		client: &http.Client{
			Transport: tr,
			Timeout:   12 * time.Second,
		},
		actorDetailsCache:     make(map[string]*models.ActorDetail),
		actorDetailsCacheTime: make(map[string]time.Time),
		actorsCache:           getSeedActors(),
		actorsCacheTime:       time.Now(),
	}

	// Async populate rich actor list on background
	go func() {
		_ = s.refreshActors()
	}()

	return s
}

func (s *ActorScraper) refreshActors() error {
	var collected []models.Actor
	seen := make(map[string]bool)

	// Fetch first 4 pages from rophim10.dev/dien-vien
	for p := 1; p <= 4; p++ {
		targetURL := fmt.Sprintf("%s/dien-vien?page=%d", RophimBaseURL, p)
		req, err := http.NewRequest("GET", targetURL, nil)
		if err != nil {
			continue
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

		resp, err := s.client.Do(req)
		if err != nil {
			continue
		}

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		_ = resp.Body.Close()
		if err != nil {
			continue
		}

		doc.Find(".item-actor").Each(func(i int, sel *goquery.Selection) {
			href, _ := sel.Find("a.v-actor, a[href*='/dien-vien/']").First().Attr("href")
			slug := strings.TrimPrefix(href, "/dien-vien/")
			slug = strings.Trim(slug, "/")
			if slug == "" || seen[slug] {
				return
			}
			seen[slug] = true

			name := sel.Find(".item-title a, a[title]").First().Text()
			if name == "" {
				name, _ = sel.Find("img").Attr("alt")
			}
			name = strings.TrimSpace(name)

			avatar, _ := sel.Find("img").Attr("src")
			if avatar == "" {
				avatar, _ = sel.Find("img").Attr("data-src")
			}

			region := detectRegionFromName(name, slug)

			collected = append(collected, models.Actor{
				Slug:   slug,
				Name:   name,
				Avatar: avatar,
				Region: region,
				Role:   "Diễn viên",
			})
		})
	}

	if len(collected) > 0 {
		s.mu.Lock()
		// Merge with seeds if any missing
		for _, seed := range getSeedActors() {
			if !seen[seed.Slug] {
				collected = append(collected, seed)
				seen[seed.Slug] = true
			}
		}
		s.actorsCache = collected
		s.actorsCacheTime = time.Now()
		s.mu.Unlock()
	}

	return nil
}

func (s *ActorScraper) GetActors(page, limit int, region, query string) ([]models.Actor, int, error) {
	s.mu.RLock()
	needsRefresh := len(s.actorsCache) == 0 || time.Since(s.actorsCacheTime) > 6*time.Hour
	s.mu.RUnlock()

	if needsRefresh {
		_ = s.refreshActors()
	}

	s.mu.RLock()
	all := make([]models.Actor, len(s.actorsCache))
	copy(all, s.actorsCache)
	s.mu.RUnlock()

	// Filter
	var filtered []models.Actor
	qLower := strings.ToLower(strings.TrimSpace(query))
	regLower := strings.ToLower(strings.TrimSpace(region))

	for _, a := range all {
		if regLower != "" && regLower != "tất cả" && regLower != "all" {
			if !strings.Contains(strings.ToLower(a.Region), regLower) {
				continue
			}
		}
		if qLower != "" {
			if !strings.Contains(strings.ToLower(a.Name), qLower) && !strings.Contains(strings.ToLower(a.Slug), qLower) {
				continue
			}
		}
		filtered = append(filtered, a)
	}

	total := len(filtered)
	if limit <= 0 {
		limit = 30
	}
	if page <= 0 {
		page = 1
	}

	start := (page - 1) * limit
	if start >= total {
		return []models.Actor{}, total, nil
	}
	end := start + limit
	if end > total {
		end = total
	}

	return filtered[start:end], total, nil
}

func (s *ActorScraper) GetActorDetail(rawSlug string) (*models.ActorDetail, error) {
	slug := normalizeSlug(rawSlug)

	s.mu.RLock()
	if cached, ok := s.actorDetailsCache[slug]; ok {
		if cacheTime, okT := s.actorDetailsCacheTime[slug]; okT && time.Since(cacheTime) < 6*time.Hour {
			s.mu.RUnlock()
			return cached, nil
		}
	}
	s.mu.RUnlock()

	targetURL := fmt.Sprintf("%s/dien-vien/%s", RophimBaseURL, slug)
	req, err := http.NewRequest("GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == 404 {
		return nil, fmt.Errorf("actor not found: %s", slug)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, err
	}

	detail := &models.ActorDetail{
		Actor: models.Actor{
			Slug: slug,
			Role: "Diễn viên",
		},
		OtherNames: "Đang cập nhật",
		Bio:        "Đang cập nhật",
		Gender:     "Nam",
		Birthday:   "Đang cập nhật",
		Movies:     []models.RophimMovie{},
	}

	// 1. Parse Name
	ogTitle, _ := doc.Find("meta[property='og:title']").Attr("content")
	if ogTitle != "" {
		detail.Actor.Name = strings.TrimPrefix(ogTitle, "Phim ")
	}
	if detail.Actor.Name == "" {
		detail.Actor.Name = strings.TrimSpace(doc.Find(".ac-profile h1, .actor-info h1, h1").First().Text())
	}
	if detail.Actor.Name == "" {
		titleText := doc.Find("title").First().Text()
		detail.Actor.Name = strings.TrimPrefix(strings.TrimSpace(titleText), "Phim ")
	}
	if detail.Actor.Name == "" {
		detail.Actor.Name = formatSlugToName(slug)
	}

	// 2. Parse Avatar
	avatar, _ := doc.Find(".v-actor img, .ac-profile img").First().Attr("src")
	if avatar == "" {
		avatar, _ = doc.Find("meta[property='og:image']").Attr("content")
	}
	detail.Actor.Avatar = avatar

	// 3. Parse sidebar details
	doc.Find(".detail-line").Each(func(i int, s *goquery.Selection) {
		t := strings.TrimSpace(s.Find(".de-title").Text())
		v := strings.TrimSpace(s.Find(".de-value, .description").Text())
		if strings.Contains(t, "Tên gọi khác") && v != "" {
			detail.OtherNames = v
		} else if strings.Contains(t, "Giới thiệu") && v != "" {
			detail.Bio = v
		} else if strings.Contains(t, "Giới tính") && v != "" {
			detail.Gender = v
		} else if strings.Contains(t, "Ngày sinh") && v != "" {
			detail.Birthday = v
		}
	})

	// Detect region
	detail.Actor.Region = detectRegionFromDetails(detail.OtherNames, detail.Actor.Name, slug)

	// 4. Parse Filmography Movies
	seenMovies := make(map[string]bool)

	doc.Find(".sw-item").Each(func(i int, s *goquery.Selection) {
		href, _ := s.Find("a.v-thumbnail").Attr("href")
		mSlug := strings.TrimPrefix(href, "/phim/")
		mSlug = strings.Trim(mSlug, "/")
		if mSlug == "" || seenMovies[mSlug] {
			return
		}
		seenMovies[mSlug] = true

		title := strings.TrimSpace(s.Find(".item-title a").Text())
		alias := strings.TrimSpace(s.Find(".alias-title a").Text())
		thumb, _ := s.Find("img").Attr("src")
		if thumb == "" {
			thumb, _ = s.Find("img").Attr("data-src")
		}

		var badges []string
		s.Find(".pin-new .line-center").Each(func(j int, b *goquery.Selection) {
			txt := strings.TrimSpace(b.Text())
			if txt != "" {
				badges = append(badges, txt)
			}
		})
		quality := strings.Join(badges, " ")
		if quality == "" {
			quality = "FHD"
		}

		year := 0
		timePoint := s.Closest(".time-row-cards").Prev().Find(".time-point span").Text()
		if y, err := strconv.Atoi(strings.TrimSpace(timePoint)); err == nil && y > 1900 {
			year = y
		}

		detail.Movies = append(detail.Movies, models.RophimMovie{
			ID:            mSlug,
			Title:         title,
			OriginalTitle: alias,
			Slug:          mSlug,
			Thumbnail:     thumb,
			Quality:       quality,
			Year:          year,
			Category:      "phim-le",
		})
	})

	// Fallback to Schema.org ItemList if .sw-item was empty
	if len(detail.Movies) == 0 {
		doc.Find("script[type='application/ld+json']").Each(func(i int, sc *goquery.Selection) {
			txt := sc.Text()
			if strings.Contains(txt, "\"ItemList\"") {
				var schemaData struct {
					ItemListElement []struct {
						Name string `json:"name"`
						URL  string `json:"url"`
					} `json:"itemListElement"`
				}
				if err := json.Unmarshal([]byte(txt), &schemaData); err == nil {
					for _, it := range schemaData.ItemListElement {
						u, _ := url.Parse(it.URL)
						mSlug := strings.TrimPrefix(u.Path, "/phim/")
						mSlug = strings.Trim(mSlug, "/")
						if mSlug != "" && !seenMovies[mSlug] {
							seenMovies[mSlug] = true
							detail.Movies = append(detail.Movies, models.RophimMovie{
								ID:       mSlug,
								Title:    it.Name,
								Slug:     mSlug,
								Quality:  "FHD",
								Category: "phim-le",
							})
						}
					}
				}
			}
		})
	}

	detail.Actor.FilmCount = len(detail.Movies)

	// Cache result
	s.mu.Lock()
	s.actorDetailsCache[slug] = detail
	s.actorDetailsCacheTime[slug] = time.Now()
	s.mu.Unlock()

	return detail, nil
}

func normalizeSlug(input string) string {
	s := strings.ToLower(strings.TrimSpace(input))
	s = strings.TrimPrefix(s, "/dien-vien/")
	s = strings.Trim(s, "/")
	// replace spaces and special chars
	reg := regexp.MustCompile(`[^a-z0-9\-]+`)
	s = reg.ReplaceAllString(s, "-")
	return strings.Trim(s, "-")
}

func formatSlugToName(slug string) string {
	parts := strings.Split(slug, "-")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, " ")
}

func detectRegionFromDetails(otherNames, name, slug string) string {
	for _, r := range otherNames {
		// Hangul range
		if (r >= 0xAC00 && r <= 0xD7AF) || (r >= 0x1100 && r <= 0x11FF) || (r >= 0x3130 && r <= 0x318F) {
			return "Hàn Quốc"
		}
		// Hanzi range
		if r >= 0x4E00 && r <= 0x9FFF {
			return "Trung Quốc"
		}
		// Japanese Hiragana & Katakana
		if (r >= 0x3040 && r <= 0x309F) || (r >= 0x30A0 && r <= 0x30FF) {
			return "Nhật Bản"
		}
	}
	return detectRegionFromName(name, slug)
}

func detectRegionFromName(name, slug string) string {
	s := strings.ToLower(slug)
	n := strings.ToLower(name)

	// Korean patterns
	if strings.Contains(s, "jeong") || strings.Contains(s, "jung") || strings.Contains(s, "kim") ||
		strings.Contains(s, "lee") || strings.Contains(s, "park") || strings.Contains(s, "choi") ||
		strings.Contains(s, "song") || strings.Contains(s, "shin") || strings.Contains(s, "hyun") ||
		strings.Contains(s, "woo") || strings.Contains(s, "seon") || strings.Contains(s, "ye-jin") {
		return "Hàn Quốc"
	}

	// Chinese patterns
	if strings.Contains(s, "trieu") || strings.Contains(s, "huynh") || strings.Contains(s, "tan-tuan") ||
		strings.Contains(s, "chen") || strings.Contains(s, "wang") || strings.Contains(s, "zhang") ||
		strings.Contains(s, "dong") || strings.Contains(s, "zhao") || strings.Contains(s, "li-") ||
		strings.Contains(s, "yang") || strings.Contains(s, "xiao") || strings.Contains(s, "zhu") ||
		strings.Contains(s, "vuong") || strings.Contains(s, "duong") || strings.Contains(s, "dich-le") {
		return "Trung Quốc"
	}

	// Vietnamese patterns
	if strings.Contains(s, "tran-thanh") || strings.Contains(s, "ninh-duong") || strings.Contains(n, "nguyễn") ||
		strings.Contains(n, "trần") || strings.Contains(n, "lê") || strings.Contains(n, "phạm") {
		return "Việt Nam"
	}

	// Japanese patterns
	if strings.Contains(s, "satomi") || strings.Contains(s, "ishihara") || strings.Contains(s, "ken") || strings.Contains(s, "tanaka") {
		return "Nhật Bản"
	}

	// Latin western names
	for _, ch := range s {
		if !unicode.IsLetter(ch) && ch != '-' {
			break
		}
	}
	if strings.Contains(s, "thompson") || strings.Contains(s, "gemmell") || strings.Contains(s, "coughlan") ||
		strings.Contains(s, "cruise") || strings.Contains(s, "johansson") || strings.Contains(s, "dicaprio") {
		return "Âu Mỹ"
	}

	return "Châu Á"
}

func getSeedActors() []models.Actor {
	return []models.Actor{
		{Slug: "trieu-le-dinh", Name: "Triệu Lệ Dĩnh", Avatar: "https://image.tmdb.org/t/p/h632/6RiJN1w8kBFG6IcPmwPdUt1EzCF.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "li-jiuxiao", Name: "Li Jiuxiao", Avatar: "https://image.tmdb.org/t/p/h632/wBaTXTKFCavDhHleVBZ1F35DWfS.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "huynh-hieu-minh", Name: "Huỳnh Hiểu Minh", Avatar: "https://image.tmdb.org/t/p/h632/eIC3tenhlbFtaGnFXhta7e25avQ.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "tan-tuan-kiet", Name: "Tần Tuấn Kiệt", Avatar: "https://image.tmdb.org/t/p/h632/q50b2VpJaO5LOM4U7qxLwcj99fM.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "chen-ming-hao", Name: "Chen Ming Hao", Avatar: "https://image.tmdb.org/t/p/h632/ksWDHeCd9Tbhtj4Zbh10EbT58CM.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "canh-lac", Name: "Cảnh Lạc", Avatar: "https://image.tmdb.org/t/p/h632/tyqtorVkTRu1ZFQsnEccwMZEf4Y.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "vuong-ngoc-van", Name: "Vương Ngọc Văn", Avatar: "https://image.tmdb.org/t/p/h632/qVv9Uf8n3o34sM4v23yK66jC8Uv.jpg", Region: "Trung Quốc", Role: "Diễn viên"},
		{Slug: "jeong-il-woo", Name: "Jeong Il-woo", Avatar: "https://image.tmdb.org/t/p/h632/2F0624w7m4M37Bw3eMh3f8eMh3f.jpg", Region: "Hàn Quốc", Role: "Diễn viên"},
		{Slug: "song-joong-ki", Name: "Song Joong-ki", Avatar: "https://image.tmdb.org/t/p/h632/v4gQ06z0kYQ3V6lH5C5h7S7J8y8.jpg", Region: "Hàn Quốc", Role: "Diễn viên"},
		{Slug: "hyun-bin", Name: "Hyun Bin", Avatar: "https://image.tmdb.org/t/p/h632/q0M41z8x1X8v4l6d8q4K2f8N1Q2.jpg", Region: "Hàn Quốc", Role: "Diễn viên"},
		{Slug: "lee-min-ho", Name: "Lee Min-ho", Avatar: "https://image.tmdb.org/t/p/h632/t5p2V2R2c5v6Q1H6f5k9P8y1T8q.jpg", Region: "Hàn Quốc", Role: "Diễn viên"},
		{Slug: "ruth-gemmell", Name: "Ruth Gemmell", Avatar: "https://image.tmdb.org/t/p/h632/7uB6G5y1H8F5x8q9w2V5q8L7k6y.jpg", Region: "Âu Mỹ", Role: "Diễn viên"},
		{Slug: "luke-thompson", Name: "Luke Thompson", Avatar: "https://image.tmdb.org/t/p/h632/3k9L8M7N6P5Q4R3S2T1U0V9W8X7.jpg", Region: "Âu Mỹ", Role: "Diễn viên"},
		{Slug: "nicola-coughlan", Name: "Nicola Coughlan", Avatar: "https://image.tmdb.org/t/p/h632/4j8K9L7M6N5P4Q3R2S1T0U9V8W7.jpg", Region: "Âu Mỹ", Role: "Diễn viên"},
		{Slug: "tran-thanh", Name: "Trấn Thành", Avatar: "https://image.tmdb.org/t/p/h632/5h7L9K8M6N5P4Q3R2S1T0U9V8W7.jpg", Region: "Việt Nam", Role: "Diễn viên, Đạo diễn"},
	}
}
