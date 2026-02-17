(function() {
    'use strict';
    
    var PlayerControls = {
        config: {
            filmInfo: null,
            qualities: [],
            currentQualityIndex: 0,
            observer: null,
            qualitiesLoaded: false
        },
        
        init: function(filmInfo) {
            this.config.filmInfo = filmInfo || window.filmInfo || {};
            this.loadQualityFromDOM();
            this.setupObserver();
        },
        
        loadQualityFromDOM: function() {
            var self = this;
            var qualityLinks = document.querySelectorAll('#quality-links .btn-link-quality');
            
            if (qualityLinks.length > 0) {
                self.config.qualities = [];
                qualityLinks.forEach(function(link, idx) {
                    self.config.qualities.push({
                        index: link.getAttribute('data-quality-index') || idx,
                        type: link.getAttribute('data-type') || link.textContent.trim()
                    });
                });
                self.config.qualitiesLoaded = true;
                return true;
            }
            return false;
        },
        
        setupObserver: function() {
            var self = this;
            var targetNode = document.getElementById('media-player-box');
            if (!targetNode) {
                setTimeout(function() { self.setupObserver(); }, 500);
                return;
            }
            
            if (this.config.observer) {
                this.config.observer.disconnect();
            }
            
            this.config.observer = new MutationObserver(function(mutations) {
                setTimeout(function() {
                    self.tryInjectButtons();
                }, 1500);
            });
            
            this.config.observer.observe(targetNode, { childList: true, subtree: true });
            
            setTimeout(function() {
                self.tryInjectButtons();
            }, 3000);
        },
        
        tryInjectButtons: function() {
            if (!this.config.qualitiesLoaded) {
                this.loadQualityFromDOM();
            }
            
            var buttonContainer = document.querySelector('#media-player-box .jw-button-container');
            if (buttonContainer && !buttonContainer.querySelector('.jw-custom-btn')) {
                this.injectControlBarButtons();
            }
        },
        
        injectControlBarButtons: function() {
            var buttonContainer = document.querySelector('#media-player-box .jw-button-container');
            if (!buttonContainer || buttonContainer.querySelector('.jw-custom-btn')) return;
            
            var insertPoint = buttonContainer.querySelector('.jw-icon-fullscreen');
            var filmInfo = this.config.filmInfo;
            
            // Tập trước
            if (filmInfo.prevEpisodeID) {
                var prevBtn = this.createButton('prev-ep', 'Tập trước', function() {
                    window.location.href = filmInfo.prevEpisodeURL;
                }, '<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>');
                buttonContainer.insertBefore(prevBtn, insertPoint);
            }
            
            // Tập tiếp
            if (filmInfo.hasNextEpisode) {
                var nextBtn = this.createButton('next-ep', 'Tập tiếp', function() {
                    window.location.href = filmInfo.nextEpisodeURL;
                }, '<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>');
                buttonContainer.insertBefore(nextBtn, insertPoint);
            }
        },
        
        createButton: function(type, tooltip, onClick, svgPath) {
            var btn = document.createElement('div');
            btn.className = 'jw-icon jw-icon-inline jw-button-color jw-reset jw-custom-btn jw-custom-' + type;
            btn.setAttribute('role', 'button');
            btn.setAttribute('tabindex', '0');
            btn.setAttribute('title', tooltip);
            btn.innerHTML = '<svg class="jw-svg-icon" viewBox="0 0 24 24">' + svgPath + '</svg>';
            btn.onclick = onClick;
            return btn;
        }
    };
    
    window.PlayerControls = PlayerControls;
    
    $(document).ready(function() {
        if (typeof filmInfo !== 'undefined' && filmInfo.episodeID) {
            PlayerControls.init(filmInfo);
        }
    });
})();
