import { supabase } from '../config/supabase';
import { format } from 'date-fns';

export interface SEOMetadata {
  page_type: string;
  page_identifier: string;
  hotel_id?: string;
  title: string;
  meta_description?: string;
  meta_keywords?: string[];
  canonical_url?: string;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  twitter_card?: string;
  twitter_title?: string;
  twitter_description?: string;
  twitter_image?: string;
  structured_data?: any;
  custom_meta_tags?: any;
}

export interface SEORedirect {
  source_url: string;
  target_url: string;
  redirect_type?: number;
  is_active?: boolean;
}

export interface SEOAnalysis {
  page_url: string;
  title_length?: number;
  description_length?: number;
  h1_count?: number;
  h2_count?: number;
  image_count?: number;
  images_without_alt?: number;
  internal_links?: number;
  external_links?: number;
  word_count?: number;
  keyword_density?: any;
  issues?: string[];
  recommendations?: string[];
  seo_score?: number;
}

class SEOOptimizationService {
  // Metadata Management
  async getPageMetadata(pageType: string, pageIdentifier: string): Promise<SEOMetadata | null> {
    const { data, error } = await supabase
      .from('seo_metadata')
      .select('*')
      .eq('page_type', pageType)
      .eq('page_identifier', pageIdentifier)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updatePageMetadata(metadata: SEOMetadata): Promise<SEOMetadata> {
    const { data, error } = await supabase
      .from('seo_metadata')
      .upsert([metadata], {
        onConflict: 'page_type,page_identifier'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async generateMetaTags(pageType: string, pageIdentifier: string, data?: any): Promise<any> {
    const metadata = await this.getPageMetadata(pageType, pageIdentifier);
    
    if (!metadata) {
      // Generate default metadata based on page type
      return this.generateDefaultMetaTags(pageType, data);
    }

    const tags: any = {
      title: metadata.title,
      meta: []
    };

    // Basic meta tags
    if (metadata.meta_description) {
      tags.meta.push({ name: 'description', content: metadata.meta_description });
    }
    if (metadata.meta_keywords?.length) {
      tags.meta.push({ name: 'keywords', content: metadata.meta_keywords.join(', ') });
    }
    if (metadata.canonical_url) {
      tags.link = [{ rel: 'canonical', href: metadata.canonical_url }];
    }

    // Open Graph tags
    if (metadata.og_title) {
      tags.meta.push({ property: 'og:title', content: metadata.og_title });
    }
    if (metadata.og_description) {
      tags.meta.push({ property: 'og:description', content: metadata.og_description });
    }
    if (metadata.og_image) {
      tags.meta.push({ property: 'og:image', content: metadata.og_image });
    }

    // Twitter Card tags
    if (metadata.twitter_card) {
      tags.meta.push({ name: 'twitter:card', content: metadata.twitter_card });
    }
    if (metadata.twitter_title) {
      tags.meta.push({ name: 'twitter:title', content: metadata.twitter_title });
    }
    if (metadata.twitter_description) {
      tags.meta.push({ name: 'twitter:description', content: metadata.twitter_description });
    }
    if (metadata.twitter_image) {
      tags.meta.push({ name: 'twitter:image', content: metadata.twitter_image });
    }

    // Custom meta tags
    if (metadata.custom_meta_tags) {
      Object.entries(metadata.custom_meta_tags).forEach(([key, value]) => {
        tags.meta.push({ name: key, content: value });
      });
    }

    // Structured data
    if (metadata.structured_data) {
      tags.structuredData = metadata.structured_data;
    }

    return tags;
  }

  private generateDefaultMetaTags(pageType: string, data?: any): any {
    const baseTitle = 'LastMinuteStay - 最高の宿泊体験を';
    const baseDescription = '最後の瞬間でも最高のホテルを。LastMinuteStayで理想の宿泊先を見つけましょう。';

    switch (pageType) {
      case 'home':
        return {
          title: baseTitle,
          meta: [
            { name: 'description', content: baseDescription },
            { property: 'og:title', content: baseTitle },
            { property: 'og:description', content: baseDescription }
          ]
        };

      case 'hotel':
        if (data?.hotel) {
          const title = `${data.hotel.name} - ${data.hotel.location} | LastMinuteStay`;
          const description = data.hotel.description || `${data.hotel.name}の詳細情報と予約`;
          
          return {
            title,
            meta: [
              { name: 'description', content: description },
              { property: 'og:title', content: title },
              { property: 'og:description', content: description }
            ],
            structuredData: this.generateHotelStructuredData(data.hotel)
          };
        }
        break;

      case 'search':
        if (data?.location) {
          const title = `${data.location}のホテル検索結果 | LastMinuteStay`;
          const description = `${data.location}で利用可能なホテルを検索。最高の価格で予約しましょう。`;
          
          return {
            title,
            meta: [
              { name: 'description', content: description },
              { property: 'og:title', content: title },
              { property: 'og:description', content: description }
            ]
          };
        }
        break;
    }

    return {
      title: baseTitle,
      meta: [{ name: 'description', content: baseDescription }]
    };
  }

  // Structured Data Generation
  private generateHotelStructuredData(hotel: any): any {
    return {
      '@context': 'https://schema.org',
      '@type': 'Hotel',
      name: hotel.name,
      description: hotel.description,
      address: {
        '@type': 'PostalAddress',
        streetAddress: hotel.address,
        addressLocality: hotel.location,
        addressRegion: hotel.prefecture,
        addressCountry: 'JP'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: hotel.latitude,
        longitude: hotel.longitude
      },
      starRating: {
        '@type': 'Rating',
        ratingValue: hotel.star_rating
      },
      amenityFeature: hotel.amenities?.map((amenity: string) => ({
        '@type': 'LocationFeatureSpecification',
        name: amenity
      })),
      image: hotel.images
    };
  }

  // URL Management
  async createRedirect(redirect: SEORedirect): Promise<SEORedirect> {
    const { data, error } = await supabase
      .from('seo_redirects')
      .insert([redirect])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRedirect(sourceUrl: string): Promise<SEORedirect | null> {
    const { data, error } = await supabase
      .from('seo_redirects')
      .select('*')
      .eq('source_url', sourceUrl)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (data) {
      // Increment hit count
      await supabase
        .from('seo_redirects')
        .update({ hit_count: data.hit_count + 1 })
        .eq('id', data.id);
    }

    return data;
  }

  // Sitemap Generation
  async generateSitemap(): Promise<any> {
    const { data: configs } = await supabase
      .from('seo_sitemap_config')
      .select('*')
      .eq('is_active', true);

    const urls: any[] = [];

    // Add static pages
    urls.push({
      loc: 'https://lastminutestay.com/',
      changefreq: 'daily',
      priority: 1.0
    });

    // Add dynamic pages based on configuration
    for (const config of configs || []) {
      if (config.url_pattern.includes('hotels')) {
        const { data: hotels } = await supabase
          .from('hotels')
          .select('id, updated_at');

        hotels?.forEach(hotel => {
          urls.push({
            loc: `https://lastminutestay.com/hotels/${hotel.id}`,
            lastmod: hotel.updated_at,
            changefreq: config.change_frequency,
            priority: config.priority
          });
        });
      }

      if (config.url_pattern.includes('locations')) {
        const { data: locations } = await supabase
          .from('hotels')
          .select('prefecture')
          .distinct();

        locations?.forEach(location => {
          urls.push({
            loc: `https://lastminutestay.com/search?location=${encodeURIComponent(location.prefecture)}`,
            changefreq: config.change_frequency,
            priority: config.priority
          });
        });
      }
    }

    return {
      urlset: {
        '@xmlns': 'http://www.sitemaps.org/schemas/sitemap/0.9',
        url: urls
      }
    };
  }

  // SEO Analysis
  async analyzePage(pageUrl: string, pageContent: string): Promise<SEOAnalysis> {
    const analysis: SEOAnalysis = {
      page_url: pageUrl,
      issues: [],
      recommendations: []
    };

    // Extract title
    const titleMatch = pageContent.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) {
      analysis.title_length = titleMatch[1].length;
      if (analysis.title_length < 30) {
        analysis.issues.push('Title too short (less than 30 characters)');
        analysis.recommendations.push('Expand title to 50-60 characters for better SEO');
      } else if (analysis.title_length > 60) {
        analysis.issues.push('Title too long (more than 60 characters)');
        analysis.recommendations.push('Shorten title to avoid truncation in search results');
      }
    } else {
      analysis.issues.push('No title tag found');
      analysis.recommendations.push('Add a descriptive title tag');
    }

    // Extract meta description
    const descMatch = pageContent.match(/<meta\s+name="description"\s+content="(.*?)"/i);
    if (descMatch) {
      analysis.description_length = descMatch[1].length;
      if (analysis.description_length < 120) {
        analysis.issues.push('Meta description too short');
        analysis.recommendations.push('Expand meta description to 150-160 characters');
      } else if (analysis.description_length > 160) {
        analysis.issues.push('Meta description too long');
        analysis.recommendations.push('Shorten meta description to avoid truncation');
      }
    } else {
      analysis.issues.push('No meta description found');
      analysis.recommendations.push('Add a compelling meta description');
    }

    // Count headings
    const h1Matches = pageContent.match(/<h1[^>]*>/gi);
    analysis.h1_count = h1Matches ? h1Matches.length : 0;
    if (analysis.h1_count === 0) {
      analysis.issues.push('No H1 tag found');
      analysis.recommendations.push('Add exactly one H1 tag with main keyword');
    } else if (analysis.h1_count > 1) {
      analysis.issues.push('Multiple H1 tags found');
      analysis.recommendations.push('Use only one H1 tag per page');
    }

    const h2Matches = pageContent.match(/<h2[^>]*>/gi);
    analysis.h2_count = h2Matches ? h2Matches.length : 0;

    // Count images
    const imgMatches = pageContent.match(/<img[^>]*>/gi);
    analysis.image_count = imgMatches ? imgMatches.length : 0;

    // Check for alt attributes
    if (imgMatches) {
      const imagesWithoutAlt = imgMatches.filter(img => !img.includes('alt=')).length;
      analysis.images_without_alt = imagesWithoutAlt;
      if (imagesWithoutAlt > 0) {
        analysis.issues.push(`${imagesWithoutAlt} images without alt text`);
        analysis.recommendations.push('Add descriptive alt text to all images');
      }
    }

    // Count links
    const internalLinks = pageContent.match(/href="\/[^"]*"/gi);
    const externalLinks = pageContent.match(/href="https?:\/\/(?!lastminutestay\.com)[^"]*"/gi);
    analysis.internal_links = internalLinks ? internalLinks.length : 0;
    analysis.external_links = externalLinks ? externalLinks.length : 0;

    // Word count
    const textContent = pageContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    analysis.word_count = textContent.split(' ').length;
    if (analysis.word_count < 300) {
      analysis.issues.push('Content too short (less than 300 words)');
      analysis.recommendations.push('Add more valuable content to improve rankings');
    }

    // Calculate SEO score
    let score = 100;
    score -= analysis.issues.length * 10;
    score = Math.max(0, Math.min(100, score));
    analysis.seo_score = score;

    // Store analysis
    const { error } = await supabase
      .from('seo_content_analysis')
      .insert([{
        ...analysis,
        analysis_date: new Date().toISOString()
      }]);

    if (error) throw error;

    return analysis;
  }

  // Performance Tracking
  async trackPagePerformance(pageUrl: string, metrics: any): Promise<void> {
    const { error } = await supabase
      .from('seo_page_performance')
      .upsert([{
        page_url: pageUrl,
        measurement_date: format(new Date(), 'yyyy-MM-dd'),
        ...metrics
      }], {
        onConflict: 'page_url,measurement_date'
      });

    if (error) throw error;
  }

  // Local SEO
  async updateLocalListing(hotelId: string, platform: string, listingData: any): Promise<any> {
    const { data, error } = await supabase
      .from('seo_local_listings')
      .upsert([{
        hotel_id: hotelId,
        platform,
        ...listingData,
        last_synced_at: new Date().toISOString()
      }], {
        onConflict: 'hotel_id,platform'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getLocalListings(hotelId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('seo_local_listings')
      .select('*')
      .eq('hotel_id', hotelId);

    if (error) throw error;
    return data || [];
  }

  // Schema Templates
  async createSchemaTemplate(name: string, schemaType: string, templateData: any): Promise<any> {
    const { data, error } = await supabase
      .from('seo_schema_templates')
      .insert([{
        template_name: name,
        schema_type: schemaType,
        template_data: templateData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSchemaTemplate(schemaType: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('seo_schema_templates')
      .select('*')
      .eq('schema_type', schemaType)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // SEO Recommendations
  async generateSEORecommendations(hotelId?: string): Promise<any[]> {
    const recommendations: any[] = [];

    // Check metadata coverage
    const { data: pages } = await supabase
      .from('cms_pages')
      .select('id, slug, hotel_id')
      .eq('status', 'published');

    for (const page of pages || []) {
      const metadata = await this.getPageMetadata('custom', page.slug);
      if (!metadata) {
        recommendations.push({
          type: 'metadata',
          priority: 'high',
          message: `Add SEO metadata for page: ${page.slug}`,
          action: 'Update page metadata with title, description, and keywords'
        });
      }
    }

    // Check image optimization
    const { data: media } = await supabase
      .from('cms_media')
      .select('*')
      .is('alt_text', null);

    if (media && media.length > 0) {
      recommendations.push({
        type: 'images',
        priority: 'medium',
        message: `${media.length} images missing alt text`,
        action: 'Add descriptive alt text to improve accessibility and SEO'
      });
    }

    // Check local listings
    if (hotelId) {
      const listings = await this.getLocalListings(hotelId);
      const platforms = ['google_my_business', 'bing_places', 'apple_maps'];
      
      platforms.forEach(platform => {
        if (!listings.find(l => l.platform === platform)) {
          recommendations.push({
            type: 'local_seo',
            priority: 'high',
            message: `Create listing on ${platform.replace('_', ' ')}`,
            action: 'Add hotel to local business directories'
          });
        }
      });
    }

    return recommendations;
  }
}

export const seoOptimizationService = new SEOOptimizationService();