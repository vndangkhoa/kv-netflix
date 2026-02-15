package database

import (
	"log"

	"streamflow-backend/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(dsn string) {
	var err error
	DB, err = gorm.Open(sqlite.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connection established")

	// Auto-migrate schema
	err = DB.AutoMigrate(&models.Video{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}
}

type VideoRepository struct {
	db *gorm.DB
}

func NewVideoRepository(db *gorm.DB) *VideoRepository {
	return &VideoRepository{db: db}
}

func (r *VideoRepository) Create(video *models.Video) error {
	return r.db.Create(video).Error
}

func (r *VideoRepository) GetByID(id uint) (*models.Video, error) {
	var video models.Video
	err := r.db.First(&video, id).Error
	return &video, err
}

func (r *VideoRepository) GetBySourceURL(url string) (*models.Video, error) {
	var video models.Video
	err := r.db.Where("source_url = ?", url).First(&video).Error
	return &video, err
}

func (r *VideoRepository) Search(query string, limit int) ([]models.Video, error) {
	var videos []models.Video
	err := r.db.Where("title LIKE ?", "%"+query+"%").Limit(limit).Find(&videos).Error
	return videos, err
}

func (r *VideoRepository) GetAll(skip int, limit int) ([]models.Video, error) {
	var videos []models.Video
	err := r.db.Offset(skip).Limit(limit).Find(&videos).Error
	return videos, err
}

func (r *VideoRepository) Update(id uint, updates map[string]interface{}) (*models.Video, error) {
	var video models.Video
	result := r.db.First(&video, id)
	if result.Error != nil {
		return nil, result.Error
	}

	err := r.db.Model(&video).Updates(updates).Error
	if err != nil {
		return nil, err
	}
	return &video, nil
}

func (r *VideoRepository) Delete(id uint) error {
	return r.db.Delete(&models.Video{}, id).Error
}
