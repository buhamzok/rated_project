// Fixed scraper source list per the project specification.
// Only The Independent currently exposes a working public RSS feed.
export interface SeedSource {
  source_name: string;
  feed_url: string;
  site_url?: string;
  notes?: string;
}

const seedSources: SeedSource[] = [
  {
    source_name: 'Daily Monitor',
    feed_url: 'https://www.monitor.co.ug/feed',
    site_url: 'https://www.monitor.co.ug',
    notes: 'Cloudflare bot protection blocks direct feed access',
  },
  {
    source_name: 'New Vision',
    feed_url: 'https://www.newvision.co.ug/feed',
    site_url: 'https://www.newvision.co.ug',
    notes: 'No public RSS feed found at build time',
  },
  {
    source_name: 'The Independent',
    feed_url: 'https://www.independent.co.ug/feed/',
    site_url: 'https://www.independent.co.ug',
    notes: 'Working WordPress RSS 2.0 feed',
  },
  {
    source_name: 'Nile Post',
    feed_url: 'https://nilepost.co.ug/feed',
    site_url: 'https://nilepost.co.ug',
    notes: 'Feed paths return HTML, not XML',
  },
  {
    source_name: 'PML Daily',
    feed_url: 'https://pmldaily.com/feed',
    site_url: 'https://pmldaily.com',
    notes: 'Cloudflare bot protection blocks direct feed access',
  },
  {
    source_name: 'Chimp Reports',
    feed_url: 'https://chimpreports.com/feed/',
    site_url: 'https://chimpreports.com',
    notes: 'RSS icon links here but endpoint returns homepage HTML',
  },
];

export default seedSources;
