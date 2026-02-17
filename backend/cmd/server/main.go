package main

import (
	"log"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"streamflow-backend/internal/api"
	"streamflow-backend/internal/database"
	"streamflow-backend/internal/scraper"
	"streamflow-backend/internal/service"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	// Register .apk MIME type
	mime.AddExtensionType(".apk", "application/vnd.android.package-archive")

	// Initialize Database
	dbPath := os.Getenv("DATABASE_URL")
	if dbPath == "" {
		dbPath = "streamflow.db"
	}
	database.InitDB(dbPath)

	// Initialize Services
	videoRepo := database.NewVideoRepository(database.DB)
	ophimService := scraper.NewOphimScraper()
	phimMoiService := scraper.NewPhimMoiChillScraper()
	tmdbService := service.NewTMDBService()
	extractorService := service.NewVideoExtractor()
	imageService := service.NewImageService()

	providers := []scraper.MovieProvider{ophimService, phimMoiService}

	// Initialize API Handler
	handler := api.NewHandler(videoRepo, providers, tmdbService, extractorService, imageService)

	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// API Routes
	r.Route("/api", func(r chi.Router) {
		r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"status":"healthy", "version":"v3.6-go"}`))
		})

		api.RegisterRoutes(r, handler)
	})

	// Static Files (Frontend)
	workDir, _ := os.Getwd()
	frontendDir := filepath.Join(workDir, "dist") // Production (Docker)

	// Check if frontend build exists in local dist, otherwise try dev path
	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		frontendDir = filepath.Join(workDir, "..", "frontend-react", "dist") // Development
	}

	// Check if frontend build exists
	if _, err := os.Stat(frontendDir); os.IsNotExist(err) {
		log.Println("Frontend build not found at", frontendDir)
	} else {
		log.Println("Serving frontend from", frontendDir)
		FileServer(r, "/", http.Dir(frontendDir))
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

// FileServer conveniently sets up a http.FileServer handler to serve
// static files from a http.FileSystem.
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
