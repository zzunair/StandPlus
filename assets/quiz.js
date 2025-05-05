// Main quiz object
const quiz = {
  currentSlide: 0,
  totalSlides: 0,
  slides: [],
  answers: {},

  init: function () {
    this.slides = document.querySelectorAll(".quiz__slide");
    this.totalSlides = this.slides.length;

    if (this.slides.length > 0) {
      this.slides[0].classList.add("active");
    }

    this.initListeners();
    this.initInputValidation();
    this.initSizeSelector();
  },

  initListeners: function () {
    const nextButtons = document.querySelectorAll('[data-action="next"]');
    nextButtons.forEach((button) => {
      button.addEventListener("click", () => this.nextSlide());
    });

    const backButtons = document.querySelectorAll('[data-action="back"]');
    backButtons.forEach((button) => {
      button.addEventListener("click", () => this.prevSlide());
    });
  },

  initInputValidation: function () {
    this.slides.forEach((slide) => {
      if (slide.classList.contains("quiz__slide--intro")) {
        return;
      }

      const slideNumber = slide.getAttribute("data-slide");
      const continueButton = slide.querySelector(".quiz__continue-button");

      if (!continueButton) return;

      continueButton.disabled = true;

      if (slideNumber === "5") {
        const textArea = slide.querySelector("textarea");
        if (textArea) {
          textArea.addEventListener("input", function () {
            continueButton.disabled = textArea.value.trim() === "";
          });
        }
        return;
      }
      
      // Add validation for email field on slide 8
      if (slideNumber === "8") {
        const emailInput = slide.querySelector('input[type="email"]');
        if (emailInput) {
          emailInput.addEventListener("input", function () {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const isValid = emailPattern.test(emailInput.value.trim());
            continueButton.disabled = !isValid;
          });
        }
        return;
      }

      const slideInputs = slide.querySelectorAll(
        'input[type="radio"], input[type="checkbox"]'
      );
      if (slideInputs.length > 0) {
        slideInputs.forEach((input) => {
          input.addEventListener("change", function () {
            if (input.type === "radio") {
              continueButton.disabled = false;
            } else if (input.type === "checkbox") {
              const anyChecked = Array.from(slideInputs).some(
                (cb) => cb.checked
              );
              continueButton.disabled = !anyChecked;
            }
          });
        });
      }
    });

    this.initSizeSelectorValidation();
  },

  initSizeSelectorValidation: function () {
    const sizeOptions = document.querySelectorAll(".size-option");
    const sizeSlideButton = document.querySelector(
      '.quiz__slide[data-slide="4"] .quiz__continue-button'
    );

    if (sizeOptions.length > 0 && sizeSlideButton) {
      sizeSlideButton.disabled = true;

      sizeOptions.forEach((option) => {
        option.addEventListener("click", function () {
          sizeOptions.forEach((opt) => opt.classList.remove("selected"));
          this.classList.add("selected");
          sizeSlideButton.disabled = false;

          const gender = document.querySelector(".men-tab.active")
            ? "men"
            : "women";
          const size = this.getAttribute(`data-${gender}-size`);
          quiz.answers[`shoe_size_${gender}`] = size;
        });
      });
    }
  },

  initSizeSelector: function () {
    const menTab = document.querySelector(".men-tab");
    const womenTab = document.querySelector(".women-tab");
    const menSizes = document.querySelectorAll(".men-size");
    const womenSizes = document.querySelectorAll(".women-size");

    if (menTab && womenTab) {
      menTab.addEventListener("click", function () {
        menTab.classList.add("active");
        womenTab.classList.remove("active");

        menSizes.forEach((size) => size.classList.remove("d-none"));
        womenSizes.forEach((size) => size.classList.add("d-none"));

        quiz.answers.gender = "men";

        const selectedSize = document.querySelector(".size-option.selected");
        if (selectedSize) {
          quiz.answers[`shoe_size_men`] =
            selectedSize.getAttribute("data-men-size");
        }
      });

      womenTab.addEventListener("click", function () {
        womenTab.classList.add("active");
        menTab.classList.remove("active");

        womenSizes.forEach((size) => size.classList.remove("d-none"));
        menSizes.forEach((size) => size.classList.add("d-none"));

        quiz.answers.gender = "women";

        const selectedSize = document.querySelector(".size-option.selected");
        if (selectedSize) {
          quiz.answers[`shoe_size_women`] =
            selectedSize.getAttribute("data-women-size");
        }
      });
    }
  },

  collectAnswers: function () {
    const radioInputs = document.querySelectorAll(
      'input[type="radio"]:checked'
    );
    radioInputs.forEach((input) => {
      this.answers[input.name] = input.value;
    });

    const checkboxGroups = {};
    const checkboxInputs = document.querySelectorAll(
      'input[type="checkbox"]:checked'
    );
    checkboxInputs.forEach((input) => {
      if (!checkboxGroups[input.name]) {
        checkboxGroups[input.name] = [];
      }
      checkboxGroups[input.name].push(input.value);
    });

    for (const group in checkboxGroups) {
      this.answers[group] = checkboxGroups[group];
    }

    const textAreaInput = document.querySelector(
      '.quiz__slide[data-slide="5"] textarea'
    );
    if (textAreaInput) {
      this.answers.additionalInfo = textAreaInput.value.trim();
    }
    
    // Collect email from slide 8
    const emailInput = document.querySelector(
      '.quiz__slide[data-slide="8"] input[type="email"]'
    );
    if (emailInput) {
      this.answers.email = emailInput.value.trim();
    }
    
    // Save answers to local storage
    localStorage.setItem('quizAnswers', JSON.stringify(this.answers));
  },

  nextSlide: function () {
    this.collectAnswers();

    if (this.currentSlide < this.totalSlides) {
      this.slides[this.currentSlide].classList.remove("active");
    }

    this.currentSlide++;

    if (this.currentSlide >= this.totalSlides) {
      this.showResults();
      return;
    }

    this.slides[this.currentSlide].classList.add("active");
    this.updateProgressBar();
  },

  prevSlide: function () {
    if (this.currentSlide <= 0) {
      return;
    }

    this.slides[this.currentSlide].classList.remove("active");

    this.currentSlide--;

    this.slides[this.currentSlide].classList.add("active");

    this.updateProgressBar();
  },

  updateProgressBar: function () {
    const progressElement = document.querySelector(".quiz__loading-progress");
    if (progressElement) {
      let progressPercentage = 0;
      if (this.totalSlides > 1) {
        progressPercentage = (this.currentSlide / (this.totalSlides - 1)) * 100;
      }

      progressElement.style.width = `${progressPercentage}%`;
    }
  },

  showResults: function () {
    console.log("Quiz completed!", this.answers);
    
    this.storeAnswersInLocalStorage();
    
    this.createResultsSlide();
  },

  createResultsSlide: function () {
    const resultsSlide = document.createElement("div");
    resultsSlide.className = "quiz__slide active";
    resultsSlide.setAttribute("data-slide", "results");

    resultsSlide.innerHTML = this.generateRecommendations();

    document.querySelector(".quiz__slides").appendChild(resultsSlide);

    const backButton = resultsSlide.querySelector(".quiz-result__back-button");
    if (backButton) {
      backButton.addEventListener("click", () => this.prevSlide());
    }

    const progressElement = document.querySelector(".quiz__loading-progress");
    if (progressElement) {
      progressElement.style.width = "100%";
    }
  },

  generateRecommendations: function () {
    return `
    <div class="quiz-result">
      <h1 class="quiz-result__title">YOUR RESULTS</h1>
      <p class="quiz-result__subtitle">Based on your responses, we recommend you:</p>
      
      <div class="quiz-result__product">
        <div class="quiz-result__product-image">
          <img src="https://www.standshoes.com/cdn/shop/files/AntiGrav2_Snow_1_6f92dadd-1974-4b43-9dde-0bda00afb927_796x.progressive.jpg?v=1733165364" alt="ANTIGRAV2 Shoe">
        </div>
        
        <div class="quiz-result__product-info">
          <div class="title-price-container">
            <h2 class="quiz-result__product-name">ANTIGRAV2</h2>
            <p class="quiz-result__product-price">$140 USD</p>
          </div>
          
          <p class="quiz-result__product-description">Normal-wide, breathable, good slip resistance</p>
          
          <div class="quiz-result__product-options">
            <div class="quiz-result__size">
              <p>Size: <span class="quiz-result__size-value">Men's 4</span></p>
              <span class="quiz-result__recommendation">Recommended: Men's 4</span>
            </div>
            <div class="quiz-result__size-selector">
              <select>
                <option>Men's 4</option>
                <option>Men's 5</option>
                <option>Men's 6</option>
              </select>
            </div>
            
            <div class="quiz-result__color">
              <p>Select Color: <span class="quiz-result__color-value">Snow</span></p>
              
              <div class="quiz-result__color-options">
                <div class="quiz-result__color-option quiz-result__color-option--selected" data-color="Snow">
                  <img src="https://www.standshoes.com/cdn/shop/files/AntiGrav2_Snow_1_6f92dadd-1974-4b43-9dde-0bda00afb927_200x200_crop_center.jpg?v=1733165364" alt="Snow">
                </div>
                <div class="quiz-result__color-option" data-color="Black">
                  <img src="https://www.standshoes.com/cdn/shop/files/AntiGrav2_Onyx_1_200x200_crop_center.jpg?v=1733165396" alt="Black">
                </div>
              </div>
            </div>
          </div>
          
          <div class="quiz-result__features">
            <div class="quiz-result__feature"><span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.55093 0.5L4.44643 1.2332V4.83358H0V8.16642H4.44643V12.5L8.55225 11.7668V8.16642H13V4.83358H8.55225V0.5H8.55093Z" fill="#F17848"/>
             </svg>
             </span> Ultimate Cushioning</div>
            <div class="quiz-result__feature"><span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.55093 0.5L4.44643 1.2332V4.83358H0V8.16642H4.44643V12.5L8.55225 11.7668V8.16642H13V4.83358H8.55225V0.5H8.55093Z" fill="#F17848"/>
             </svg>
             </span> Joint Support</div>
            <div class="quiz-result__feature"><span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.55093 0.5L4.44643 1.2332V4.83358H0V8.16642H4.44643V12.5L8.55225 11.7668V8.16642H13V4.83358H8.55225V0.5H8.55093Z" fill="#F17848"/>
             </svg>
             </span> Recovery Boost</div>
            <div class="quiz-result__feature"><span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.55093 0.5L4.44643 1.2332V4.83358H0V8.16642H4.44643V12.5L8.55225 11.7668V8.16642H13V4.83358H8.55225V0.5H8.55093Z" fill="#F17848"/>
             </svg>
             </span> Custom Moldable</div>
            <div class="quiz-result__feature"><span>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.55093 0.5L4.44643 1.2332V4.83358H0V8.16642H4.44643V12.5L8.55225 11.7668V8.16642H13V4.83358H8.55225V0.5H8.55093Z" fill="#F17848"/>
             </svg>
             </span> Easy to Clean</div>
            <div class="quiz-result__feature"><span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8.55093 0.5L4.44643 1.2332V4.83358H0V8.16642H4.44643V12.5L8.55225 11.7668V8.16642H13V4.83358H8.55225V0.5H8.55093Z" fill="#F17848"/>
             </svg>
             </span> ASTM Certified Oil-Slip Resistant</div>
          </div>
        </div>
      </div>
      
      <div class="quiz-result__actions">
        <button class="quiz-result__add-to-cart">ADD TO CART →</button>
        <p class="quiz-result__shopify-pay">or four installments of $40.00 with <span>Shop Pay</span></p>
      </div>
    </div>
  `;
  },

  storeAnswersInLocalStorage: function() {
    try {
      // Convert answers object to JSON string
      const answersJSON = JSON.stringify(this.answers);
      
      // Store in localStorage
      localStorage.setItem('quizAnswers', answersJSON);
      
      console.log('Quiz answers saved to localStorage:', this.answers);
    } catch (error) {
      console.error('Error saving quiz answers to localStorage:', error);
    }
  },
};


document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".quiz__slide--intro").classList.add("active");

  document
    .querySelectorAll(
      ".quiz__slide:not(.quiz__slide--intro) .quiz__continue-button"
    )
    .forEach((button) => {
      button.disabled = true;
    });

  quiz.init();
  initSizeGuidePopup();

  console.log(
    "Total slides found:",
    document.querySelectorAll(".quiz__slide").length
  );
});

// Size guide popup functionality
function initSizeGuidePopup() {
  // Get popup elements
  const popup = document.getElementById('sizeguide-popup');
  const closeButton = document.querySelector('.sizeguide-popup__close');
  const body = document.body;
  
  // Function to toggle body scroll
  function toggleBodyScroll(disable) {
    if (disable) {
      // Save the current scroll position
      const scrollY = window.scrollY;
      // Add styles to body to disable scrolling
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.width = '100%';
      body.style.overflowY = 'scroll';
      // Store the scroll position to restore later
      body.setAttribute('data-scroll-position', scrollY);
    } else {
      // Remove the styles to re-enable scrolling
      body.style.position = '';
      body.style.top = '';
      body.style.width = '';
      body.style.overflowY = '';
      // Restore the scroll position
      window.scrollTo(0, parseInt(body.getAttribute('data-scroll-position') || '0'));
    }
  }
  
  // Connect the size guide button in the size selector (Question 4)
  const sizeGuideButton = document.querySelector('.size-guide-button');
  if (sizeGuideButton) {
    sizeGuideButton.addEventListener('click', function(e) {
      e.preventDefault();
      popup.style.display = 'flex';
      toggleBodyScroll(true); // Disable body scroll
    });
  }
  
  // Close button functionality
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      popup.style.display = 'none';
      toggleBodyScroll(false); // Re-enable body scroll
    });
  }
  
  // Close when clicking outside the popup content
  popup.addEventListener('click', function(e) {
    if (e.target === popup) {
      popup.style.display = 'none';
      toggleBodyScroll(false); // Re-enable body scroll
    }
  });
  
  // Also connect the size guide link in quiz results (if it exists)
  const resultSizeGuide = document.querySelector('.quiz-result__size-guide');
  if (resultSizeGuide) {
    resultSizeGuide.addEventListener('click', function(e) {
      e.preventDefault();
      popup.style.display = 'flex';
      toggleBodyScroll(true); // Disable body scroll
    });
  }
}