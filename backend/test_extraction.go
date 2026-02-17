package main

import (
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
)

func main() {
	clientJar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar: clientJar,
	}

	pageURL := "https://phimmoichill.my/xem/khong-tac-phan-2-tap-1-pm17096"
	fmt.Printf("Testing extraction for: %s\n", pageURL)

	// 1. Get initial page to establish session/cookies
	req, _ := http.NewRequest("GET", pageURL, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Error fetching page: %v\n", err)
		return
	}
	bodyBytes, _ := io.ReadAll(resp.Body)
	body := string(bodyBytes)
	resp.Body.Close()

	// 2. Extract Episode ID and Film ID
	reEp := regexp.MustCompile(`chillplay\("(\d+)"\)`)
	matchEp := reEp.FindStringSubmatch(body)
	if len(matchEp) < 2 {
		fmt.Println("Failed to extract episode ID")
		return
	}
	episodeID := matchEp[1]
	fmt.Printf("Extracted Episode ID: %s\n", episodeID)

	reFilm := regexp.MustCompile(`filmId:(\d+)`)
	matchFilm := reFilm.FindStringSubmatch(body)
	if len(matchFilm) < 2 {
		reFilm = regexp.MustCompile(`dbId: (\d+)`)
		matchFilm = reFilm.FindStringSubmatch(body)
	}
	if len(matchFilm) < 2 {
		fmt.Println("Failed to extract film ID")
		return
	}
	filmID := matchFilm[1]
	fmt.Printf("Extracted Film ID: %s\n", filmID)

	// 3. Update movie view (Corrected key to 'id')
	updateURL := "https://phimmoichill.my/ajax/movie_update_view"
	updateData := url.Values{
		"id": {filmID},
	}
	reqUpdate, _ := http.NewRequest("POST", updateURL, strings.NewReader(updateData.Encode()))
	reqUpdate.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
	reqUpdate.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
	reqUpdate.Header.Set("X-Requested-With", "XMLHttpRequest")
	reqUpdate.Header.Set("Referer", pageURL)
	reqUpdate.Header.Set("Origin", "https://phimmoichill.my")

	respUpdate, err := client.Do(reqUpdate)
	if err == nil {
		updateBody, _ := io.ReadAll(respUpdate.Body)
		fmt.Printf("Movie view update response: %s\n", string(updateBody))
		respUpdate.Body.Close()
	}

	// 4. Call chillsplayer.php for different servers
	for sv := 0; sv <= 3; sv++ {
		fmt.Printf("\n--- Testing Server SV=%d ---\n", sv)
		playerURL := "https://phimmoichill.my/chillsplayer.php"
		playerData := url.Values{
			"qcao": {episodeID},
			"sv":   {fmt.Sprintf("%d", sv)},
		}
		reqPlayer, _ := http.NewRequest("POST", playerURL, strings.NewReader(playerData.Encode()))
		reqPlayer.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
		reqPlayer.Header.Set("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
		reqPlayer.Header.Set("X-Requested-With", "XMLHttpRequest")
		reqPlayer.Header.Set("Referer", pageURL)
		reqPlayer.Header.Set("Origin", "https://phimmoichill.my")

		respPost, err := client.Do(reqPlayer)
		if err != nil {
			fmt.Printf("Error fetching player config for SV=%d: %v\n", sv, err)
			continue
		}

		playerBodyBytes, _ := io.ReadAll(respPost.Body)
		respPost.Body.Close()
		playerBody := string(playerBodyBytes)

		// Look for iniPlayers hash or iframe src
		rePlayers := regexp.MustCompile(`iniPlayers\("([^"]*)",`)
		matchPlayers := rePlayers.FindStringSubmatch(playerBody)

		reIframe := regexp.MustCompile(`iframe.*?src=".*?id=([^"&]+)"`)
		matchIframe := reIframe.FindStringSubmatch(playerBody)

		if len(matchPlayers) > 1 && matchPlayers[1] != "" {
			hash := matchPlayers[1]
			fmt.Printf("SUCCESS! Extracted Hash (iniPlayers) for SV=%d: %s\n", sv, hash)
			fmt.Printf("Potential HLS URL: https://sotrim.topphimmoi.org/mpeg/%s/index.m3u8\n", hash)
		} else if len(matchIframe) > 1 && matchIframe[1] != "" {
			hash := matchIframe[1]
			fmt.Printf("SUCCESS! Extracted Hash (Iframe) for SV=%d: %s\n", sv, hash)
			fmt.Printf("Potential HLS URL: https://sotrim.topphimmoi.org/mpeg/%s/index.m3u8\n", hash)
		} else {
			fmt.Printf("Failed to extract hash for SV=%d\n", sv)
			if idx := strings.Index(playerBody, "iniPlayers"); idx != -1 {
				end := idx + 40
				if end > len(playerBody) {
					end = len(playerBody)
				}
				fmt.Printf("  Snippet: %s\n", playerBody[idx:end])
			}
		}
	}
}
