/**
 * Standalone script to store Netlify documentation in Mem0 memory system
 * Run with: node scripts/store-netlify-docs-standalone.js
 */

import Mem0 from 'mem0ai';

// Initialize Mem0 with API key
const mem0 = new Mem0({
  apiKey: 'om-9dskxufppowhhtze1e2lbj0wovqlw3vf'
});

// Mock user for storing documentation
const docUser = { id: 'netlify-docs-system' };

const netlifyDocumentation = {
  'Development & Functions': [
    {
      title: 'Netlify CLI: Manage Functions',
      url: 'https://docs.netlify.com/cli/manage-functions/',
      description: 'Create, test, and serve Netlify functions locally using the Netlify CLI. Invoke functions, debug, and deploy with ease.',
      tags: ['cli', 'functions', 'local-development', 'debugging']
    },
    {
      title: 'Netlify Edge Functions Overview',
      url: 'https://docs.netlify.com/edge-functions/overview/',
      description: 'Fast, personalized web experiences using TypeScript/JavaScript at the edge with Netlify; modify requests, localize content, serve ads, authenticate users, and more.',
      tags: ['edge-functions', 'typescript', 'javascript', 'personalization']
    },
    {
      title: 'Netlify Edge Functions API',
      url: 'https://docs.netlify.com/edge-functions/api/',
      description: 'Netlify Edge Functions API reference guide: request handling, response types, context object, supported Web APIs, and more.',
      tags: ['edge-functions', 'api', 'reference', 'web-apis']
    },
    {
      title: 'Netlify Edge Functions: Get Started',
      url: 'https://docs.netlify.com/edge-functions/get-started/',
      description: 'Learn to create, test, deploy, invoke, and monitor Netlify Edge Functions.',
      tags: ['edge-functions', 'getting-started', 'deployment', 'monitoring']
    },
    {
      title: 'Netlify Dev: Local Development',
      url: 'https://docs.netlify.com/cli/local-development/',
      description: 'Develop and share Netlify sites locally; use Netlify Dev for local development environments, including custom configurations and HTTPS.',
      tags: ['cli', 'local-development', 'https', 'configuration']
    },
    {
      title: 'VS Code Netlify CLI Debugging',
      url: 'https://docs.netlify.com/cli/debug-with-vscode/',
      description: 'Configure VS Code to debug Netlify CLI functions and development server.',
      tags: ['vscode', 'debugging', 'cli', 'development']
    },
    {
      title: 'Netlify CLI: Get Started',
      url: 'https://docs.netlify.com/cli/get-started/',
      description: 'Use Netlify\'s command-line interface for local development, builds, and deployment.',
      tags: ['cli', 'getting-started', 'deployment', 'builds']
    },
    {
      title: 'Netlify API Quickstart',
      url: 'https://docs.netlify.com/api/get-started/',
      description: 'Netlify API basics, deployment, common endpoints, and authentication using OAuth2.',
      tags: ['api', 'oauth2', 'authentication', 'deployment']
    },
    {
      title: 'Netlify Async Workloads',
      url: 'https://docs.netlify.com/async-workloads/writing-workloads/',
      description: 'Develop Async Workload functions with Netlify; includes installation, function writing, event handling, retries, error handling, and type safety.',
      tags: ['async-workloads', 'functions', 'event-handling', 'error-handling']
    }
  ],
  
  'Framework Integration': [
    {
      title: 'Next.js Advanced API Routes',
      url: 'https://docs.netlify.com/frameworks/next-js/runtime-v4/advanced-api-routes/',
      description: 'Advanced API routes for Next.js on Netlify Runtime v4, including background and scheduled API routes.',
      tags: ['nextjs', 'api-routes', 'runtime-v4', 'scheduling']
    },
    {
      title: 'Next.js Adapter v5',
      url: 'https://docs.netlify.com/frameworks/next-js/overview/',
      description: 'Netlify\'s Next.js adapter v5 configures Netlify sites for optimal performance, including caching, on-demand revalidation, and image optimization.',
      tags: ['nextjs', 'adapter', 'performance', 'caching', 'image-optimization']
    },
    {
      title: 'Angular on Netlify',
      url: 'https://docs.netlify.com/frameworks/angular/',
      description: 'Deploy and optimize Angular apps on Netlify; leverage Netlify Image CDN, serverless functions, and more.',
      tags: ['angular', 'deployment', 'image-cdn', 'serverless']
    },
    {
      title: 'Deploy Express on Netlify',
      url: 'https://docs.netlify.com/frameworks/express/',
      description: 'Deploy Express apps on Netlify using Netlify Functions; integrate with frontend or standalone.',
      tags: ['express', 'functions', 'backend', 'nodejs']
    },
    {
      title: 'Astro on Netlify',
      url: 'https://docs.netlify.com/frameworks/astro/',
      description: 'Deploy high-performance Astro sites on Netlify; leverage features like partial hydration, Netlify Image CDN, and server-side rendering.',
      tags: ['astro', 'ssr', 'hydration', 'performance']
    },
    {
      title: 'Gatsby on Netlify',
      url: 'https://docs.netlify.com/frameworks/gatsby/?gatsby-version=adapters',
      description: 'Gatsby and Netlify integration: features, adapters, build processes, and performance optimization. Covers Gatsby versions, Netlify plugins, and configuration.',
      tags: ['gatsby', 'adapters', 'build-process', 'performance', 'plugins']
    },
    {
      title: 'Hugo framework on Netlify',
      url: 'https://docs.netlify.com/frameworks/hugo/',
      description: 'Fast static site generator; build speed, themes, Netlify integration, and version control.',
      tags: ['hugo', 'static-site-generator', 'themes', 'build-speed']
    },
    {
      title: 'Eleventy Static Site Generator on Netlify',
      url: 'https://docs.netlify.com/frameworks/eleventy/',
      description: 'Flexible, JavaScript-based SSG; Netlify integration, Edge Functions, build configurations.',
      tags: ['eleventy', 'javascript', 'ssg', 'edge-functions']
    }
  ],

  'Build & Configuration': [
    {
      title: 'Netlify Build Configuration',
      url: 'https://docs.netlify.com/configure-builds/overview/',
      description: 'Configure Netlify\'s build settings, including build commands, publish directories, and more.',
      tags: ['build', 'configuration', 'commands', 'directories']
    },
    {
      title: 'Netlify File-Based Configuration',
      url: 'https://docs.netlify.com/configure-builds/file-based-configuration/',
      description: 'Configure Netlify builds, deploys, and settings using the netlify.toml file; learn best practices.',
      tags: ['netlify-toml', 'configuration', 'best-practices']
    },
    {
      title: 'Netlify Build Environment Variables',
      url: 'https://docs.netlify.com/configure-builds/environment-variables/',
      description: 'Configure Netlify environment variables for builds; access and use them in your build process.',
      tags: ['environment-variables', 'build', 'configuration']
    },
    {
      title: 'Netlify Build Software',
      url: 'https://docs.netlify.com/configure-builds/available-software-at-build-time/',
      description: 'Netlify build\'s available software, including languages (Node.js, Python, Ruby, etc.) and tools (npm, yarn, hugo etc.), versions, and configuration.',
      tags: ['build-software', 'nodejs', 'python', 'ruby', 'tools']
    },
    {
      title: 'Netlify Build Plugins',
      url: 'https://docs.netlify.com/build-plugins/',
      description: 'Extend Netlify build functionality with plugins; install, create, share, and manage plugins for enhanced build processes.',
      tags: ['plugins', 'build', 'extensibility']
    },
    {
      title: 'Netlify Dependency Management',
      url: 'https://docs.netlify.com/configure-builds/manage-dependencies/',
      description: 'Manage dependencies for Netlify builds, specifying Node.js, Go, PHP, Python, Ruby, Rust, and Swift versions and dependencies.',
      tags: ['dependencies', 'nodejs', 'python', 'ruby', 'php', 'go', 'rust', 'swift']
    },
    {
      title: 'Netlify Monorepo Builds',
      url: 'https://docs.netlify.com/configure-builds/monorepos/',
      description: 'Configure Netlify builds for monorepo projects; automated and manual configuration options; base, package, build, and publish directory settings; commit status control.',
      tags: ['monorepo', 'build-configuration', 'commit-status']
    }
  ],

  'Data & Storage': [
    {
      title: 'Netlify Blobs Overview',
      url: 'https://docs.netlify.com/blobs/overview/',
      description: 'Netlify Blobs: Store and retrieve blobs and unstructured data; use as a key/value store or database; offers CRUD operations via functions, edge functions, build plugins, and CLI.',
      tags: ['blobs', 'storage', 'key-value', 'crud', 'database']
    },
    {
      title: 'Netlify Connect Overview',
      url: 'https://docs.netlify.com/connect/overview/',
      description: 'Unify content sources, access data through GraphQL API, improve web architecture, and boost performance with Netlify Connect.',
      tags: ['connect', 'graphql', 'content', 'data-sources']
    },
    {
      title: 'Netlify Connect Data Access',
      url: 'https://docs.netlify.com/connect/access-data/',
      description: 'Access and query Netlify Connect data using GraphQL APIs, sandboxes, and clients; includes schema review, query optimization, and caching details.',
      tags: ['connect', 'graphql', 'data-access', 'optimization', 'caching']
    }
  ],

  'Forms & User Input': [
    {
      title: 'Netlify Form Setup',
      url: 'https://docs.netlify.com/forms/setup/',
      description: 'Enable Netlify Forms, configure HTML or JavaScript forms, handle submissions, and set up notifications.',
      tags: ['forms', 'setup', 'html', 'javascript', 'notifications']
    },
    {
      title: 'Netlify Forms Notifications',
      url: 'https://docs.netlify.com/forms/notifications/',
      description: 'Configure email notifications for form submissions using Netlify Forms.',
      tags: ['forms', 'notifications', 'email']
    },
    {
      title: 'Netlify Form Spam Filters',
      url: 'https://docs.netlify.com/forms/spam-filters/',
      description: 'Prevent spam submissions with Akismet, honeypot fields, and reCAPTCHA; manage spam and verified submissions.',
      tags: ['forms', 'spam-prevention', 'akismet', 'recaptcha', 'honeypot']
    }
  ],

  'Domain & HTTPS Management': [
    {
      title: 'Netlify Custom Domains',
      url: 'https://docs.netlify.com/domains/domains-fundamentals/domains-glossary/#custom-domain',
      description: 'Configure custom domains for Netlify sites, including production, previews, and branches.',
      tags: ['domains', 'custom-domains', 'production', 'previews']
    },
    {
      title: 'Netlify HTTPS Setup Guide',
      url: 'https://docs.netlify.com/domains/secure-domains-with-https/https-ssl/',
      description: 'Configure Netlify for HTTPS, using automatic certificates or your own custom certificates.',
      tags: ['https', 'ssl', 'certificates', 'security']
    },
    {
      title: 'External DNS Configuration',
      url: 'https://docs.netlify.com/domains/configure-domains/configure-external-dns/',
      description: 'Configure external DNS to point your domain to Netlify; instructions for apex and subdomains.',
      tags: ['dns', 'external-dns', 'apex', 'subdomains']
    }
  ]
};

async function addMemory(message, metadata) {
  try {
    const response = await mem0.add(message, {
      user_id: docUser.id,
      metadata: metadata
    });
    return response;
  } catch (error) {
    console.error('Error adding memory:', error);
    return null;
  }
}

async function storeDocumentationCategory(category, docs) {
  console.log(`\nStoring ${category} documentation...`);
  
  for (const doc of docs) {
    try {
      const memory = await addMemory(
        `Netlify Documentation: ${doc.title} - ${doc.description}`,
        {
          type: 'netlify_documentation',
          category: category.toLowerCase().replace(/\s+/g, '_'),
          title: doc.title,
          url: doc.url,
          tags: doc.tags,
          platform: 'netlify',
          doc_type: 'reference',
          language: 'general',
          created_date: new Date().toISOString()
        }
      );
      
      if (memory) {
        console.log(`✅ Stored: ${doc.title}`);
      } else {
        console.log(`❌ Failed: ${doc.title}`);
      }
    } catch (error) {
      console.error(`Error storing ${doc.title}:`, error);
    }
  }
}

async function storeAllDocumentation() {
  console.log('🚀 Starting Netlify documentation storage in Mem0...');

  // Store overview memory
  await addMemory(
    'Netlify is a web platform for building highly performant, secure, and reliable websites and web apps. This documentation covers all major areas: Development & Functions, Framework Integration, Build & Configuration, Data & Storage, Forms & User Input, Domain & HTTPS Management, Team & Account Management, and Billing & Usage.',
    {
      type: 'netlify_documentation',
      category: 'overview',
      title: 'Netlify Platform Overview',
      platform: 'netlify',
      doc_type: 'overview',
      created_date: new Date().toISOString()
    }
  );

  console.log('✅ Stored: Netlify Platform Overview');

  // Store each category
  for (const [category, docs] of Object.entries(netlifyDocumentation)) {
    await storeDocumentationCategory(category, docs);
  }

  console.log('\n✅ All Netlify documentation has been stored in Mem0!');
  console.log('📝 You can now search for specific Netlify topics using the memory system.');
  
  // Test search
  console.log('\n🔍 Testing search functionality...');
  try {
    const results = await mem0.search('Edge Functions', { user_id: docUser.id });
    console.log(`Found ${results.results?.length || 0} results for "Edge Functions"`);
  } catch (error) {
    console.error('Search test failed:', error);
  }
}

// Run the script
storeAllDocumentation().catch(console.error);