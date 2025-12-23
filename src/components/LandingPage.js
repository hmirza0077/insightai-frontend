import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import Logo from './Logo';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const { t, toggleLanguage, language } = useLanguage();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isBookAnimating, setIsBookAnimating] = useState(false);
  const bookRef = useRef(null);

  // Extracted words that will animate - now showing actual text/letters
  const extractedLetters = [
    'A', 'B', 'C', 'ا', 'ب', 'D', 'E', 'پ', 'F', 'G', 'ت', 'H'
  ];

  // Testimonials data
  const testimonials = [
    {
      name: language === 'fa' ? 'دکتر سارا احمدی' : 'Dr. Sarah Ahmed',
      role: language === 'fa' ? 'پژوهشگر دانشگاهی' : 'Academic Researcher',
      avatar: '👩‍🔬',
      text: language === 'fa' 
        ? 'این پلتفرم کار تحقیقاتی من را متحول کرد. توانایی تحلیل صدها مقاله و ایجاد پایگاه دانش قابل جستجو باورنکردنی است.'
        : 'This platform transformed my research work. The ability to analyze hundreds of papers and create searchable knowledge bases is incredible.',
    },
    {
      name: language === 'fa' ? 'علی محمدی' : 'Ali Mohammadi',
      role: language === 'fa' ? 'وکیل حقوقی' : 'Legal Attorney',
      avatar: '👨‍⚖️',
      text: language === 'fa'
        ? 'بررسی اسناد حقوقی که قبلاً ساعت‌ها طول می‌کشید، حالا در چند دقیقه انجام می‌شود. پشتیبانی دوزبانه برای پرونده‌های بین‌المللی عالی است.'
        : 'Reviewing legal documents that used to take hours now takes minutes. The bilingual support is perfect for international cases.',
    },
    {
      name: language === 'fa' ? 'مریم رضایی' : 'Maryam Rezaei',
      role: language === 'fa' ? 'مدیر محتوا' : 'Content Manager',
      avatar: '👩‍💼',
      text: language === 'fa'
        ? 'ما از این ابزار برای مدیریت مستندات شرکت استفاده می‌کنیم. قابلیت پرسش و پاسخ هوشمند زمان آموزش کارکنان جدید را نصف کرده است.'
        : 'We use this for managing company documentation. The smart Q&A feature has cut new employee training time in half.',
    },
    {
      name: language === 'fa' ? 'دکتر حسین کریمی' : 'Dr. Hossein Karimi',
      role: language === 'fa' ? 'پزشک متخصص' : 'Medical Specialist',
      avatar: '👨‍⚕️',
      text: language === 'fa'
        ? 'تحلیل مقالات پزشکی و استخراج اطلاعات کلیدی به من کمک می‌کند تا با آخرین تحقیقات به‌روز بمانم.'
        : 'Analyzing medical papers and extracting key information helps me stay updated with the latest research.',
    },
    {
      name: language === 'fa' ? 'نازنین شریفی' : 'Nazanin Sharifi',
      role: language === 'fa' ? 'دانشجوی دکتری' : 'PhD Student',
      avatar: '👩‍🎓',
      text: language === 'fa'
        ? 'نوشتن پایان‌نامه با این ابزار بسیار آسان‌تر شد. می‌توانم از منابع فارسی و انگلیسی همزمان استفاده کنم.'
        : 'Writing my thesis became so much easier. I can work with Persian and English sources simultaneously.',
    },
  ];

  // Plans data - Credit-based pricing
  const plans = [
    {
      id: 'starter',
      name: language === 'fa' ? 'استارتر' : 'Starter',
      icon: '🌱',
      credits: 100,
      price: language === 'fa' ? '۲۵۰,۰۰۰ تومان' : '$5',
      pricePerCredit: language === 'fa' ? '۲,۵۰۰ تومان/اعتبار' : '$0.05/credit',
      description: language === 'fa' 
        ? 'مناسب برای آشنایی با پلتفرم'
        : 'Perfect for trying out the platform',
      features: language === 'fa' ? [
        '۱۰۰ اعتبار',
        'پردازش تا ۵۰ صفحه',
        'ابزارهای OCR پایه',
        '۲ پایگاه دانش',
        '۱ عامل هوشمند',
        'پشتیبانی ایمیلی',
      ] : [
        '100 credits',
        'Process up to 50 pages',
        'Basic OCR tools',
        '2 Knowledge bases',
        '1 AI Agent',
        'Email support',
      ],
      highlighted: false,
    },
    {
      id: 'basic',
      name: language === 'fa' ? 'پایه' : 'Basic',
      icon: '🚀',
      credits: 500,
      price: language === 'fa' ? '۱,۰۰۰,۰۰۰ تومان' : '$20',
      pricePerCredit: language === 'fa' ? '۲,۰۰۰ تومان/اعتبار' : '$0.04/credit',
      savings: language === 'fa' ? '۲۰٪ صرفه‌جویی' : '20% savings',
      description: language === 'fa'
        ? 'عالی برای کاربران معمولی'
        : 'Great for regular users',
      features: language === 'fa' ? [
        '۵۰۰ اعتبار',
        'پردازش تا ۳۰۰ صفحه',
        'ابزارهای OCR پیشرفته',
        '۵ پایگاه دانش',
        '۳ عامل هوشمند',
        'پشتیبانی اولویت‌دار',
      ] : [
        '500 credits',
        'Process up to 300 pages',
        'Advanced OCR tools',
        '5 Knowledge bases',
        '3 AI Agents',
        'Priority support',
      ],
      highlighted: false,
    },
    {
      id: 'pro',
      name: language === 'fa' ? 'حرفه‌ای' : 'Pro',
      icon: '⭐',
      credits: 1500,
      price: language === 'fa' ? '۲,۵۰۰,۰۰۰ تومان' : '$50',
      pricePerCredit: language === 'fa' ? '۱,۶۶۷ تومان/اعتبار' : '$0.033/credit',
      savings: language === 'fa' ? '۳۳٪ صرفه‌جویی' : '33% savings',
      description: language === 'fa'
        ? 'بهترین ارزش برای حرفه‌ای‌ها'
        : 'Best value for professionals',
      features: language === 'fa' ? [
        '۱,۵۰۰ اعتبار',
        'پردازش تا ۱۰۰۰ صفحه',
        'تمام ابزارهای OCR تجاری',
        'پایگاه دانش نامحدود',
        'عامل هوشمند نامحدود',
        'پشتیبانی ۲۴/۷',
        'دسترسی API',
      ] : [
        '1,500 credits',
        'Process up to 1000 pages',
        'All commercial OCR tools',
        'Unlimited Knowledge bases',
        'Unlimited AI Agents',
        '24/7 support',
        'API access',
      ],
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: language === 'fa' ? 'سازمانی' : 'Enterprise',
      icon: '🏢',
      credits: 5000,
      price: language === 'fa' ? '۷,۵۰۰,۰۰۰ تومان' : '$150',
      pricePerCredit: language === 'fa' ? '۱,۵۰۰ تومان/اعتبار' : '$0.03/credit',
      savings: language === 'fa' ? '۴۰٪ صرفه‌جویی' : '40% savings',
      description: language === 'fa'
        ? 'برای تیم‌ها و سازمان‌ها'
        : 'For teams and organizations',
      features: language === 'fa' ? [
        '۵,۰۰۰ اعتبار',
        'پردازش نامحدود',
        'تمام امکانات ویژه',
        'مدیر حساب اختصاصی',
        'یکپارچه‌سازی سفارشی',
        'همکاری تیمی',
        'امنیت پیشرفته',
        'تضمین SLA',
      ] : [
        '5,000 credits',
        'Unlimited processing',
        'All premium features',
        'Dedicated account manager',
        'Custom integrations',
        'Team collaboration',
        'Advanced security',
        'SLA guarantee',
      ],
      highlighted: false,
    },
  ];

  // Rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  // Trigger book animation on scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isBookAnimating) {
            setIsBookAnimating(true);
          }
        });
      },
      { 
        threshold: 0.2,
        rootMargin: '0px 0px -100px 0px'
      }
    );

    const currentRef = bookRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    // Also trigger on page load after a short delay
    const timer = setTimeout(() => {
      setIsBookAnimating(true);
    }, 500);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      clearTimeout(timer);
    };
  }, [isBookAnimating]);

  // Floating words for background
  const floatingWords = ['AI', 'OCR', 'NLP', 'PDF', 'KB', '📚', '🔍', '💡', '🤖', '📄'];

  return (
    <div className={`landing-page ${language === 'fa' ? 'rtl' : 'ltr'} theme-dark`}>
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <Logo size={40} />
            <span className="brand-name">InsightAI</span>
          </div>
          <div className="nav-actions">
            <button onClick={toggleLanguage} className="lang-btn">
              {language === 'fa' ? 'English' : 'فارسی'}
            </button>
            <button onClick={() => navigate('/login')} className="login-btn">
              {language === 'fa' ? 'ورود' : 'Login'}
            </button>
            <button onClick={() => navigate('/login')} className="signup-btn">
              {language === 'fa' ? 'شروع رایگان' : 'Start Free'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section with Book Animation */}
      <section className="hero-section">
        <div className="hero-background">
          {floatingWords.map((word, i) => (
            <span 
              key={i} 
              className="floating-word"
              style={{
                '--delay': `${i * 0.5}s`,
                '--x': `${10 + Math.random() * 80}%`,
                '--y': `${10 + Math.random() * 80}%`,
              }}
            >
              {word}
            </span>
          ))}
        </div>
        
        <div className="hero-content">
          {/* Book Animation Container */}
          <div 
            ref={bookRef}
            className={`book-animation-container ${isBookAnimating ? 'animate' : ''}`}
          >
            {/* The Book */}
            <div className="book-wrapper">
              <div className="book-3d">
                <div className="book-spine"></div>
                <div className="book-cover-front">
                  <div className="book-title">📖</div>
                  <div className="book-subtitle">{language === 'fa' ? 'سند شما' : 'Your Document'}</div>
                </div>
                <div className="book-cover-back"></div>
                <div className="book-pages-side"></div>
                
                {/* Flying Pages - going to the right/forward */}
                <div className="flying-pages">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flying-page" style={{ '--page-index': i }}>
                      <div className="page-lines">
                        <span></span><span></span><span></span><span></span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Arrow from Book to Letters */}
            <div className="flow-arrow-down first-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Extracted Letters */}
            <div className="extracted-letters">
              {extractedLetters.map((letter, i) => (
                <span 
                  key={i} 
                  className="extracted-letter"
                  style={{ '--letter-index': i }}
                >
                  {letter}
                </span>
              ))}
            </div>

            {/* Arrow from Letters to KB */}
            <div className="flow-arrow-down second-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Knowledge Base Result */}
            <div className="kb-result">
              <div className="kb-icon-wrapper">
                <div className="kb-icon-glow"></div>
                <div className="kb-icon">🧠</div>
              </div>
              <span className="kb-label">{language === 'fa' ? 'پایگاه دانش' : 'Knowledge Base'}</span>
              <div className="kb-features">
                <span className="kb-feature">🔍 {language === 'fa' ? 'جستجو' : 'Search'}</span>
                <span className="kb-feature">💬 {language === 'fa' ? 'پرسش' : 'Q&A'}</span>
                <span className="kb-feature">🤖 {language === 'fa' ? 'AI' : 'AI'}</span>
              </div>
            </div>
          </div>

          {/* Hero Text */}
          <div className="hero-text">
            <h1>
              {language === 'fa' 
                ? 'اسناد خود را به دانش هوشمند تبدیل کنید'
                : 'Transform Your Documents Into Smart Knowledge'}
            </h1>
            <p>
              {language === 'fa'
                ? 'با هوش مصنوعی پیشرفته، اسناد PDF، تصاویر و متون خود را تحلیل کنید، ترجمه کنید و پایگاه دانش قابل جستجو بسازید.'
                : 'Analyze PDFs, images, and texts with advanced AI. Translate, extract, and build searchable knowledge bases.'}
            </p>
            <div className="hero-cta">
              <button onClick={() => navigate('/login')} className="cta-primary">
                {language === 'fa' ? 'شروع کنید - رایگان' : 'Get Started - Free'}
              </button>
              <button className="cta-secondary">
                {language === 'fa' ? 'مشاهده دمو' : 'Watch Demo'}
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">10K+</span>
                <span className="stat-label">{language === 'fa' ? 'سند پردازش شده' : 'Documents Processed'}</span>
              </div>
              <div className="stat">
                <span className="stat-number">500+</span>
                <span className="stat-label">{language === 'fa' ? 'کاربر فعال' : 'Active Users'}</span>
              </div>
              <div className="stat">
                <span className="stat-number">99%</span>
                <span className="stat-label">{language === 'fa' ? 'دقت OCR' : 'OCR Accuracy'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">
            {language === 'fa' ? 'قابلیت‌های پلتفرم' : 'Platform Features'}
          </h2>
          <p className="section-subtitle">
            {language === 'fa'
              ? 'همه ابزارهایی که برای مدیریت هوشمند اسناد نیاز دارید'
              : 'All the tools you need for intelligent document management'}
          </p>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>{language === 'fa' ? 'استخراج متن پیشرفته' : 'Advanced Text Extraction'}</h3>
              <p>
                {language === 'fa'
                  ? 'استخراج متن از PDF، تصاویر و اسناد اسکن شده با OCR پیشرفته و پشتیبانی کامل از زبان فارسی.'
                  : 'Extract text from PDFs, images, and scanned documents with advanced OCR and full Persian language support.'}
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>{language === 'fa' ? 'ترجمه هوشمند' : 'Smart Translation'}</h3>
              <p>
                {language === 'fa'
                  ? 'ترجمه خودکار اسناد بین فارسی و انگلیسی با حفظ ساختار و معنای متن.'
                  : 'Automatic document translation between Persian and English while preserving structure and meaning.'}
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3>{language === 'fa' ? 'پایگاه دانش' : 'Knowledge Base'}</h3>
              <p>
                {language === 'fa'
                  ? 'ایجاد پایگاه دانش قابل جستجو از اسناد خود و پرسش و پاسخ هوشمند با AI.'
                  : 'Create searchable knowledge bases from your documents and ask questions with AI-powered Q&A.'}
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>{language === 'fa' ? 'عامل‌های هوشمند' : 'AI Agents'}</h3>
              <p>
                {language === 'fa'
                  ? 'ایجاد دستیارهای هوشمند سفارشی که به سوالات شما از روی اسناد پاسخ می‌دهند.'
                  : 'Create custom AI assistants that answer your questions based on your documents.'}
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>{language === 'fa' ? 'امنیت بالا' : 'High Security'}</h3>
              <p>
                {language === 'fa'
                  ? 'اسناد شما با رمزنگاری پیشرفته محافظت می‌شوند و فقط شما به آن‌ها دسترسی دارید.'
                  : 'Your documents are protected with advanced encryption and only you have access to them.'}
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>{language === 'fa' ? 'دوزبانه کامل' : 'Fully Bilingual'}</h3>
              <p>
                {language === 'fa'
                  ? 'رابط کاربری کاملاً دوزبانه فارسی و انگلیسی برای راحتی کار شما.'
                  : 'Fully bilingual Persian and English interface for your convenience.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <h2 className="section-title">
            {language === 'fa' ? 'چگونه کار می‌کند؟' : 'How It Works'}
          </h2>
          
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-icon">📤</div>
              <h3>{language === 'fa' ? 'آپلود سند' : 'Upload Document'}</h3>
              <p>{language === 'fa' ? 'PDF، تصویر یا سند خود را آپلود کنید' : 'Upload your PDF, image, or document'}</p>
            </div>
            
            <div className="step-arrow">→</div>
            
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-icon">⚙️</div>
              <h3>{language === 'fa' ? 'پردازش هوشمند' : 'Smart Processing'}</h3>
              <p>{language === 'fa' ? 'AI متن را استخراج و تحلیل می‌کند' : 'AI extracts and analyzes the text'}</p>
            </div>
            
            <div className="step-arrow">→</div>
            
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-icon">💬</div>
              <h3>{language === 'fa' ? 'پرسش و پاسخ' : 'Ask Questions'}</h3>
              <p>{language === 'fa' ? 'از اسناد خود سوال بپرسید' : 'Ask questions about your documents'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section">
        <div className="section-container">
          <h2 className="section-title">
            {language === 'fa' ? 'نظرات کاربران' : 'What Our Users Say'}
          </h2>
          <p className="section-subtitle">
            {language === 'fa'
              ? 'تجربه کاربران از صنایع مختلف'
              : 'Experiences from users across different industries'}
          </p>
          
          <div className="testimonials-carousel">
            <div className="testimonials-track" style={{ transform: `translateX(${language === 'fa' ? activeTestimonial * 100 : -activeTestimonial * 100}%)` }}>
              {testimonials.map((testimonial, index) => (
                <div key={index} className="testimonial-card">
                  <div className="testimonial-avatar">{testimonial.avatar}</div>
                  <p className="testimonial-text">"{testimonial.text}"</p>
                  <div className="testimonial-author">
                    <span className="author-name">{testimonial.name}</span>
                    <span className="author-role">{testimonial.role}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="testimonial-dots">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  className={`dot ${index === activeTestimonial ? 'active' : ''}`}
                  onClick={() => setActiveTestimonial(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="section-container">
          <h2 className="section-title">
            {language === 'fa' ? 'پلن‌های اعتباری' : 'Credit Plans'}
          </h2>
          <p className="section-subtitle">
            {language === 'fa'
              ? 'اعتبار بخرید و از خدمات استفاده کنید - هرچه بیشتر بخرید، ارزان‌تر!'
              : 'Buy credits and use services - the more you buy, the cheaper!'}
          </p>
          
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.highlighted ? 'highlighted' : ''}`}>
                {plan.highlighted && (
                  <div className="popular-badge">
                    {language === 'fa' ? 'محبوب‌ترین' : 'Most Popular'}
                  </div>
                )}
                {plan.savings && (
                  <div className="savings-badge">
                    {plan.savings}
                  </div>
                )}
                <div className="plan-icon">{plan.icon}</div>
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-credits-display">
                  <span className="credits-number">{plan.credits.toLocaleString()}</span>
                  <span className="credits-label">{language === 'fa' ? 'اعتبار' : 'Credits'}</span>
                </div>
                <div className="plan-price">
                  <span className="price-amount">{plan.price}</span>
                </div>
                <div className="price-per-credit">{plan.pricePerCredit}</div>
                <p className="plan-description">{plan.description}</p>
                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <span className="check-icon">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button 
                  className={`plan-btn ${plan.highlighted ? 'primary' : 'secondary'}`}
                  onClick={() => navigate('/login')}
                >
                  {language === 'fa' ? 'خرید اعتبار' : 'Buy Credits'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <h2>
            {language === 'fa' 
              ? 'آماده شروع هستید؟'
              : 'Ready to Get Started?'}
          </h2>
          <p>
            {language === 'fa'
              ? 'همین حالا ثبت‌نام کنید و ۵ دلار اعتبار رایگان دریافت کنید.'
              : 'Sign up now and get $5 free credit to start.'}
          </p>
          <button onClick={() => navigate('/login')} className="cta-btn">
            {language === 'fa' ? 'ثبت‌نام رایگان' : 'Sign Up Free'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-main">
            <div className="footer-brand">
              <Logo size={48} />
              <span className="brand-name">InsightAI</span>
              <p className="brand-tagline">
                {language === 'fa'
                  ? 'پلتفرم هوشمند تحلیل اسناد'
                  : 'Intelligent Document Analysis Platform'}
              </p>
            </div>
            
            <div className="footer-links">
              <div className="footer-column">
                <h4>{language === 'fa' ? 'محصول' : 'Product'}</h4>
                <a href="#features">{language === 'fa' ? 'قابلیت‌ها' : 'Features'}</a>
                <a href="#pricing">{language === 'fa' ? 'قیمت‌گذاری' : 'Pricing'}</a>
                <a href="#demo">{language === 'fa' ? 'دمو' : 'Demo'}</a>
                <a href="#api">{language === 'fa' ? 'API' : 'API'}</a>
              </div>
              
              <div className="footer-column">
                <h4>{language === 'fa' ? 'شرکت' : 'Company'}</h4>
                <a href="#about">{language === 'fa' ? 'درباره ما' : 'About Us'}</a>
                <a href="#blog">{language === 'fa' ? 'وبلاگ' : 'Blog'}</a>
                <a href="#careers">{language === 'fa' ? 'فرصت‌های شغلی' : 'Careers'}</a>
                <a href="#contact">{language === 'fa' ? 'تماس با ما' : 'Contact'}</a>
              </div>
              
              <div className="footer-column">
                <h4>{language === 'fa' ? 'پشتیبانی' : 'Support'}</h4>
                <a href="#help">{language === 'fa' ? 'راهنما' : 'Help Center'}</a>
                <a href="#docs">{language === 'fa' ? 'مستندات' : 'Documentation'}</a>
                <a href="#status">{language === 'fa' ? 'وضعیت سرویس' : 'Status'}</a>
                <a href="#faq">{language === 'fa' ? 'سوالات متداول' : 'FAQ'}</a>
              </div>
              
              <div className="footer-column">
                <h4>{language === 'fa' ? 'قانونی' : 'Legal'}</h4>
                <a href="#privacy">{language === 'fa' ? 'حریم خصوصی' : 'Privacy Policy'}</a>
                <a href="#terms">{language === 'fa' ? 'شرایط استفاده' : 'Terms of Service'}</a>
                <a href="#cookies">{language === 'fa' ? 'کوکی‌ها' : 'Cookie Policy'}</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-social">
              <a href="#twitter" className="social-link">𝕏</a>
              <a href="#linkedin" className="social-link">in</a>
              <a href="#github" className="social-link">⌘</a>
              <a href="#telegram" className="social-link">✈</a>
            </div>
            <p className="copyright">
              © 2024 InsightAI. {language === 'fa' ? 'تمامی حقوق محفوظ است.' : 'All rights reserved.'}
            </p>
            <div className="footer-lang">
              <button onClick={toggleLanguage} className="footer-lang-btn">
                🌐 {language === 'fa' ? 'English' : 'فارسی'}
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
