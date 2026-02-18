package main

import (
	"context"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"streamflow-backend/internal/api"
	"streamflow-backend/internal/config"
	"streamflow-backend/internal/database"
	"streamflow-backend/internal/scraper"
	"streamflow-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	mime.AddExtensionType(".apk", "application/vnd.android.package-archive")

	cfg := config.Load()

	database.InitDB(cfg.DatabaseURL)

	videoRepo := database.NewVideoRepository(database.DB)
	ophimService := scraper.NewOphimScraper()
	phimMoiService := scraper.NewPhimMoiChillScraper()
	tmdbService := service.NewTMDBService()
	extractorService := service.NewVideoExtractor()
	imageService := service.NewImageService()

	providers := []scraper.MovieProvider{ophimService, phimMoiService}

	handler := api.NewHandler(videoRepo, providers, tmdbService, extractorService, imageService)

	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Request-ID"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"status":"healthy", "version":"v3.7"}`))
		})

		api.RegisterRoutes(r, handler)
	})

	workDir, _ := os.Getwd()
	frontendDir := filepath.Join(workDir, "dist")

	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		frontendDir = filepath.Join(workDir, "..", "frontend-react", "dist")
	}

	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		log.Println("Frontend build not found at", frontendDir)
	} else {
		log.Println("Serving frontend from", frontendDir)
		FileServer(r, "/", http.Dir(frontendDir))
	}

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func FileServer(r chi.Router, path string, root http.FileSystem) {
	if path != "/" && path[len(path)-1] != '/' {
		r.Get(path, http.RedirectHandler(path+"/", 301).ServeHTTP)
		path += "/"
	}
	path += "*"

	r.Get(path, func(w http.ResponseWriter, r *http.Request) {
		rctx := chi.RouteContext(r.Context())
		pathPrefix := strings.TrimSuffix(rctx.RoutePattern(), "/*")
		fs := http.StripPrefix(pathPrefix, http.FileServer(root))
		fs.ServeHTTP(w, r)
	})
}
