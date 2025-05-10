import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { contentApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Volume2 } from 'lucide-react';
import { useVapi } from '@/contexts/VapiContext';
import { Badge } from '@/components/ui/badge';
import MeNovaLogo from '@/components/MeNovaLogo';
import { BreadcrumbTrail } from '@/components/BreadcrumbTrail';

// Mock article content for the article view when API is not available
const mockArticleContent = {
  "understanding-perimenopause-symptoms": {
    title: "Understanding Perimenopause Symptoms",
    fullContent: `
      <h2>What is Perimenopause?</h2>
      <p>Perimenopause refers to the transition period leading up to menopause when the ovaries gradually begin to produce less estrogen. This phase can start as early as your late 30s, but most commonly begins in women during their 40s. It can last anywhere from a few months to 10 years, with the average duration being about 4 years.</p>
      
      <h2>Common Symptoms of Perimenopause</h2>
      <p>During perimenopause, hormonal fluctuations can cause various symptoms that affect your physical and emotional well-being. Here are some of the most common symptoms:</p>
      
      <h3>1. Irregular Periods</h3>
      <p>One of the first signs of perimenopause is changes in your menstrual cycle. Your periods may become irregular – longer or shorter, heavier or lighter, or may skip months altogether. This irregularity occurs because ovulation becomes unpredictable during this time.</p>
      
      <h3>2. Hot Flashes and Night Sweats</h3>
      <p>These sudden feelings of warmth that spread over your body, particularly in the face, neck, and chest, are among the most reported symptoms. They can vary in intensity and frequency and may be accompanied by sweating, particularly at night, which can disrupt sleep.</p>
      
      <h3>3. Sleep Disturbances</h3>
      <p>Many women experience difficulty falling asleep or staying asleep during perimenopause. This can be due to night sweats, or it can occur independently as a symptom of hormonal changes.</p>
      
      <h3>4. Mood Changes</h3>
      <p>Hormonal fluctuations can lead to mood swings, irritability, increased anxiety, or feelings of sadness. Some women may experience symptoms similar to premenstrual syndrome (PMS) but more intensely or for longer durations.</p>
      
      <h3>5. Vaginal Dryness</h3>
      <p>Decreased estrogen levels can cause the tissues of the vagina and urethra to lose lubrication and elasticity, leading to discomfort during intercourse and increased susceptibility to urinary or vaginal infections.</p>
      
      <h2>Managing Perimenopause Symptoms</h2>
      <p>Understanding and recognizing these symptoms can help you navigate this transitional phase more effectively. Here are some strategies to manage perimenopause symptoms:</p>
      
      <ul>
        <li><strong>Maintain a healthy lifestyle:</strong> Regular exercise, a balanced diet, and adequate sleep can help manage symptoms and improve overall well-being.</li>
        <li><strong>Stay cool:</strong> If you experience hot flashes, dress in layers, keep your bedroom cool, and avoid triggers like spicy foods, alcohol, and caffeine.</li>
        <li><strong>Practice stress reduction:</strong> Techniques such as yoga, meditation, or deep breathing can help manage stress and mood changes.</li>
        <li><strong>Consider medical interventions:</strong> Talk to your healthcare provider about options like hormone therapy, non-hormonal medications, or other treatments that might help alleviate your specific symptoms.</li>
      </ul>
      
      <p>Remember, perimenopause is a natural part of the aging process, and while it may bring challenges, understanding what's happening in your body can help you navigate this transition with confidence.</p>
    `,
    author: {
      name: "Dr. Sarah Johnson",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg",
      credentials: "OB/GYN, Women's Health Specialist",
    },
    publishedDate: "May 15, 2023",
    category: ["Perimenopause", "Symptoms", "Health"],
    relatedArticles: ["hot-flashes-management", "hormone-replacement-therapy"],
  },
  "hot-flashes-management": {
    title: "Hot Flashes: Causes and Relief Strategies",
    fullContent: `
      <h2>Understanding Hot Flashes</h2>
      <p>Hot flashes are one of the most common symptoms experienced during menopause and perimenopause. They are sudden feelings of warmth that spread over your body, particularly in the face, neck, and chest, often accompanied by sweating and sometimes followed by chills.</p>
      
      <h2>What Causes Hot Flashes?</h2>
      <p>Hot flashes are believed to be primarily caused by hormonal changes that affect the body's temperature regulation. As estrogen levels decline during menopause, the hypothalamus (the part of the brain that regulates body temperature) becomes more sensitive to slight changes in body temperature.</p>
      
      <p>When the hypothalamus senses that you're too warm, it starts a chain of events to cool you down — your blood vessels dilate, your skin gets red and warm, and you start to sweat. This cooling mechanism is triggered more easily during menopause, sometimes even when there isn't an actual rise in your body temperature.</p>
      
      <h2>Common Triggers for Hot Flashes</h2>
      <p>While hormonal changes are the underlying cause, certain factors can trigger or worsen hot flashes:</p>
      
      <ul>
        <li><strong>Warm environments:</strong> Heated rooms, hot weather, or hot baths</li>
        <li><strong>Spicy foods:</strong> Foods containing capsaicin can trigger a heat response</li>
        <li><strong>Alcohol and caffeine:</strong> These can dilate blood vessels and increase body temperature</li>
        <li><strong>Smoking:</strong> Nicotine can affect hormone levels and trigger hot flashes</li>
        <li><strong>Stress and anxiety:</strong> Emotional responses can trigger the body's heat response</li>
        <li><strong>Tight clothing:</strong> Especially synthetic fabrics that don't breathe well</li>
      </ul>
      
      <h2>Effective Strategies for Managing Hot Flashes</h2>
      
      <h3>Lifestyle Adjustments</h3>
      <p>Making certain changes to your daily habits can significantly reduce the frequency and intensity of hot flashes:</p>
      
      <ul>
        <li><strong>Dress in layers:</strong> This allows you to remove clothing when you feel warm</li>
        <li><strong>Use cooling products:</strong> Fans, cooling pillows, or cooling towels can provide relief</li>
        <li><strong>Identify and avoid triggers:</strong> Keep a journal to track what seems to precede your hot flashes</li>
        <li><strong>Stay hydrated:</strong> Drink cold water before and during a hot flash</li>
        <li><strong>Practice deep breathing:</strong> When you feel a hot flash coming on, take slow, deep breaths</li>
        <li><strong>Maintain a healthy weight:</strong> Excess weight can worsen hot flashes</li>
      </ul>
      
      <h3>Medical Interventions</h3>
      <p>If lifestyle changes aren't providing enough relief, discuss these options with your healthcare provider:</p>
      
      <ul>
        <li><strong>Hormone Therapy (HT):</strong> The most effective treatment for hot flashes, though it has risks and benefits that need to be individually assessed</li>
        <li><strong>Non-hormonal prescription medications:</strong> Certain antidepressants, anti-seizure drugs, and blood pressure medications have been found effective for some women</li>
        <li><strong>Complementary therapies:</strong> Acupuncture, certain herbal supplements, or cognitive behavioral therapy may help some women</li>
      </ul>
      
      <h2>When to Seek Help</h2>
      <p>While hot flashes are normal during menopause, consult your healthcare provider if:</p>
      
      <ul>
        <li>Hot flashes significantly interfere with your daily life or sleep</li>
        <li>You experience other symptoms that concern you</li>
        <li>You're having difficulty managing symptoms on your own</li>
      </ul>
      
      <p>Remember, hot flashes are a common experience shared by many women during this life stage. With the right strategies, you can effectively manage this symptom and minimize its impact on your quality of life.</p>
    `,
    author: {
      name: "Dr. Rebecca Lee",
      avatar: "https://randomuser.me/api/portraits/women/22.jpg",
      credentials: "Endocrinologist, Menopause Specialist",
    },
    publishedDate: "June 3, 2023",
    category: ["Hot Flashes", "Symptoms", "Relief"],
    relatedArticles: ["understanding-perimenopause-symptoms", "hormone-replacement-therapy"],
  },
  "hormone-replacement-therapy": {
    title: "Hormone Replacement Therapy Explained",
    fullContent: `
      <h2>What is Hormone Replacement Therapy?</h2>
      <p>Hormone Replacement Therapy (HRT) is a treatment used to supplement the body with hormones that decline during menopause. It typically involves taking estrogen alone or estrogen combined with progestin (a synthetic form of progesterone) to alleviate menopausal symptoms and, in some cases, to prevent certain long-term health conditions.</p>
      
      <h2>Types of Hormone Replacement Therapy</h2>
      
      <h3>Systemic Hormone Therapy</h3>
      <p>This comes in various forms including pills, skin patches, rings, gels, creams, or sprays. Systemic estrogen travels throughout the bloodstream and to all parts of the body, effectively treating many common menopausal symptoms.</p>
      
      <h3>Low-dose Vaginal Products</h3>
      <p>These come as creams, tablets, or rings and release a small amount of estrogen that is absorbed by the vaginal tissues. They can effectively treat vaginal and urinary symptoms while minimizing absorption into the body.</p>
      
      <h2>Benefits of HRT</h2>
      <p>HRT can effectively address many menopausal symptoms and may offer other health benefits:</p>
      
      <ul>
        <li><strong>Relief from hot flashes and night sweats:</strong> Often the primary reason women seek HRT</li>
        <li><strong>Improved sleep quality:</strong> By reducing night sweats and helping regulate sleep patterns</li>
        <li><strong>Alleviation of vaginal symptoms:</strong> Including dryness, itching, burning, and discomfort during intercourse</li>
        <li><strong>Prevention of bone loss:</strong> Estrogen helps maintain bone density and can reduce fracture risk</li>
        <li><strong>Possible cardiovascular benefits:</strong> When started early in menopause (though this remains under study)</li>
        <li><strong>Mood stabilization:</strong> May help with mood swings, irritability, and mild depression in some women</li>
      </ul>
      
      <h2>Potential Risks and Side Effects</h2>
      <p>HRT isn't suitable for everyone and carries certain risks that need to be carefully weighed against the benefits:</p>
      
      <ul>
        <li><strong>Breast cancer:</strong> Combined estrogen-progestin therapy may increase breast cancer risk, particularly with long-term use</li>
        <li><strong>Blood clots:</strong> HRT may increase the risk of blood clots in the legs and lungs</li>
        <li><strong>Heart disease:</strong> The relationship is complex; timing of initiation seems important</li>
        <li><strong>Stroke:</strong> There may be a slightly increased risk, especially with oral forms</li>
        <li><strong>Common side effects:</strong> Breast tenderness, headaches, nausea, bloating, and mood changes</li>
      </ul>
      
      <h2>Who Should Consider HRT?</h2>
      <p>HRT may be appropriate for:</p>
      
      <ul>
        <li>Women experiencing moderate to severe menopausal symptoms</li>
        <li>Those who experience early menopause (before age 40) or have had their ovaries removed</li>
        <li>Women at risk for osteoporosis who cannot take non-estrogen treatments</li>
      </ul>
      
      <h2>Who Should Avoid HRT?</h2>
      <p>HRT is generally not recommended for women who:</p>
      
      <ul>
        <li>Have or have had breast cancer, endometrial cancer, or certain other estrogen-sensitive cancers</li>
        <li>Have a history of blood clots or stroke</li>
        <li>Have liver disease or unexplained vaginal bleeding</li>
        <li>Have had a heart attack or are at high risk for cardiovascular disease</li>
      </ul>
      
      <h2>Making an Informed Decision</h2>
      <p>The decision to use HRT should be individualized based on:</p>
      
      <ul>
        <li>Your specific symptoms and their impact on your quality of life</li>
        <li>Your personal medical history and risk factors</li>
        <li>Your family history, particularly of breast cancer, heart disease, or osteoporosis</li>
        <li>Your preferences and concerns about treatment</li>
      </ul>
      
      <p>It's essential to have a detailed discussion with your healthcare provider about the potential benefits and risks of HRT in your specific situation. Regular follow-up appointments are also important to reassess the need for continued treatment and to monitor for any side effects or complications.</p>
      
      <p>Remember, HRT is just one option for managing menopausal symptoms. Other approaches, including lifestyle modifications and non-hormonal medications, may also be effective for many women.</p>
    `,
    author: {
      name: "Dr. Elizabeth White",
      avatar: "https://randomuser.me/api/portraits/women/32.jpg",
      credentials: "Reproductive Endocrinologist",
    },
    publishedDate: "July 22, 2023",
    category: ["HRT", "Treatment", "Medical"],
    relatedArticles: ["understanding-perimenopause-symptoms", "hot-flashes-management"],
  }
};

const ArticleView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { articleId } = useParams<{ articleId: string }>();
  const { speak } = useVapi();
  const [loading, setLoading] = useState(true);
  const [article, setArticle] = useState<any>(null);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);

  useEffect(() => {
    const loadArticle = async () => {
      setLoading(true);
      
      try {
        // Try to get the article from the API
        const apiArticle = await contentApi.getContentById(articleId || '');
        
        if (apiArticle) {
          setArticle(apiArticle);
          
          // Load related articles if available
          if (apiArticle.relatedArticles && apiArticle.relatedArticles.length > 0) {
            const related = await Promise.all(
              apiArticle.relatedArticles.map((id: string) => contentApi.getContentById(id))
            );
            setRelatedArticles(related.filter(Boolean));
          }
        } else {
          // Fallback to mock data
          const articleSlug = articleId?.split('/').pop() || '';
          const mockArticle = mockArticleContent[articleSlug as keyof typeof mockArticleContent];
          
          if (mockArticle) {
            setArticle(mockArticle);
            
            // Load related mock articles
            if (mockArticle.relatedArticles && mockArticle.relatedArticles.length > 0) {
              const related = mockArticle.relatedArticles.map(
                (id: string) => mockArticleContent[id as keyof typeof mockArticleContent]
              );
              setRelatedArticles(related.filter(Boolean));
            }
          }
        }
      } catch (error) {
        console.error('Error loading article:', error);
        
        // Fallback to mock data on error
        const articleSlug = articleId?.split('/').pop() || '';
        const mockArticle = mockArticleContent[articleSlug as keyof typeof mockArticleContent];
        
        if (mockArticle) {
          setArticle(mockArticle);
          
          // Load related mock articles
          if (mockArticle.relatedArticles && mockArticle.relatedArticles.length > 0) {
            const related = mockArticle.relatedArticles.map(
              (id: string) => mockArticleContent[id as keyof typeof mockArticleContent]
            );
            setRelatedArticles(related.filter(Boolean));
          }
        }
      } finally {
        setLoading(false);
      }
    };
    
    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  const handleReadContent = () => {
    if (article && speak) {
      // Extract text content from HTML
      const textContent = article.fullContent.replace(/<[^>]*>/g, ' ');
      speak(textContent);
    }
  };

  const handleGoBack = () => {
    navigate('/resources');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-menova-background to-white pt-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-6">
            <MeNovaLogo />
            <div className="flex space-x-2">
              {/* Add any header buttons/actions here */}
            </div>
          </div>
          
          <BreadcrumbTrail currentPath={location.pathname} />
          
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <Button variant="ghost" className="w-fit" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
            </Button>
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-menova-background to-white pt-6">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex justify-between items-center mb-6">
            <MeNovaLogo />
            <div className="flex space-x-2">
              {/* Add any header buttons/actions here */}
            </div>
          </div>
          
          <BreadcrumbTrail currentPath={location.pathname} />
          
          <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <Button variant="ghost" className="w-fit" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
            </Button>
            <Card>
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-semibold mb-4">Article Not Found</h2>
                <p className="text-muted-foreground">
                  Sorry, the article you're looking for doesn't exist or has been moved.
                </p>
                <Button onClick={handleGoBack} className="mt-4">
                  Return to Resources
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-menova-background to-white pt-6">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-6">
          <MeNovaLogo />
          <div className="flex space-x-2">
            {/* Add any header buttons/actions here */}
          </div>
        </div>
        
        <BreadcrumbTrail currentPath={location.pathname} />
        
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
          <Button variant="ghost" className="w-fit" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{article.title}</h1>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={article.author?.avatar} />
                  <AvatarFallback>{article.author?.name?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{article.author?.name}</p>
                  {article.author?.credentials && (
                    <p className="text-xs text-muted-foreground">{article.author.credentials}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {article.publishedDate && (
                  <span className="text-sm text-muted-foreground">{article.publishedDate}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReadContent}
                  title="Read article aloud"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {article.category && article.category.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {article.category.map((cat: string) => (
                <Badge key={cat} variant="outline" className="bg-teal-50 text-teal-700">
                  {cat}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="prose prose-gray max-w-none">
            <div dangerouslySetInnerHTML={{ __html: article.fullContent }} />
          </div>
          
          {relatedArticles.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold mb-4">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relatedArticles.map((related) => (
                  <Card 
                    key={related.title} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/article/${related.id || related.relatedArticles}`)}
                  >
                    <CardHeader>
                      <CardTitle className="text-lg">{related.title}</CardTitle>
                      {related.author && (
                        <CardDescription>By {related.author.name}</CardDescription>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleView; 