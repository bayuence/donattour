/**
 * Cek apakah API endpoint bisa diakses tanpa login
 * Ini untuk menentukan data mana yang bisa di-preload sebelum login
 */

// Daftar endpoint yang bisa diakses tanpa login
const PUBLIC_ENDPOINTS = [
  '/api/products',
  '/api/products?all=true',
  '/api/outlets',
  '/api/outlets?all=true',
  '/api/payment-methods',
  '/api/receipt-settings',
  '/api/menu-categories',
  '/api/donat-variants',
];

// Daftar endpoint yang butuh login
const PRIVATE_ENDPOINTS = [
  '/api/employees',
  '/api/transactions',
  '/api/sales',
  '/api/reports',
  '/api/users',
];

/**
 * Cek apakah endpoint bisa diakses tanpa auth
 */
export function isPublicEndpoint(url: string): boolean {
  // Cek pattern match
  for (const pattern of PUBLIC_ENDPOINTS) {
    if (url.includes(pattern)) {
      return true;
    }
  }
  
  // Cek regex match untuk pattern yang lebih kompleks
  const publicPatterns = [
    /^\/api\/products(\/.*)?$/,
    /^\/api\/outlets(\/.*)?$/,
    /^\/api\/payment-methods(\/.*)?$/,
    /^\/api\/receipt-settings(\/.*)?$/,
    /^\/api\/menu-categories(\/.*)?$/,
    /^\/api\/donat-variants(\/.*)?$/,
  ];
  
  return publicPatterns.some(pattern => pattern.test(url));
}

/**
 * Cek apakah endpoint butuh login
 */
export function isPrivateEndpoint(url: string): boolean {
  for (const pattern of PRIVATE_ENDPOINTS) {
    if (url.includes(pattern)) {
      return true;
    }
  }
  
  const privatePatterns = [
    /^\/api\/employees(\/.*)?$/,
    /^\/api\/transactions(\/.*)?$/,
    /^\/api\/sales(\/.*)?$/,
    /^\/api\/reports(\/.*)?$/,
    /^\/api\/users(\/.*)?$/,
  ];
  
  return privatePatterns.some(pattern => pattern.test(url));
}

/**
 * Coba akses endpoint untuk verifikasi
 */
export async function testEndpointAccessibility(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD', // Hanya cek headers, tidak download body
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Jika 401/403, butuh auth
    if (response.status === 401 || response.status === 403) {
      return false;
    }
    
    // Jika 200/404/500 (tapi bukan auth error), bisa diakses
    return true;
  } catch (error) {
    console.error(`[API Check] Error checking ${url}:`, error);
    return false;
  }
}

/**
 * Preload data publik jika endpoint bisa diakses
 */
export async function preloadIfAccessible(endpoints: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    endpoints.map(async (url) => {
      try {
        const isPublic = isPublicEndpoint(url);
        
        if (!isPublic) {
          results[url] = false;
          console.log(`[Preload] Skipping ${url} - private endpoint`);
          return;
        }
        
        // Coba akses endpoint
        const accessible = await testEndpointAccessibility(url);
        
        if (accessible) {
          // Preload data
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            console.log(`[Preload] ✅ ${url}: ${data.data?.length || data.length} items`);
            
            // Cache di localStorage untuk akses cepat
            try {
              localStorage.setItem(`cache_${btoa(url)}`, JSON.stringify(data));
            } catch (e) {
              // Ignore storage errors
            }
            
            results[url] = true;
          } else {
            results[url] = false;
            console.log(`[Preload] ❌ ${url}: HTTP ${response.status}`);
          }
        } else {
          results[url] = false;
          console.log(`[Preload] ❌ ${url}: Not accessible`);
        }
      } catch (error) {
        results[url] = false;
        console.error(`[Preload] ❌ ${url}:`, error);
      }
    })
  );
  
  return results;
}

/**
 * Get cached data dari localStorage
 */
export function getCachedData<T>(url: string): T | null {
  try {
    const key = `cache_${btoa(url)}`;
    const cached = localStorage.getItem(key);
    
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error(`[Cache] Error getting cached data for ${url}:`, error);
  }
  
  return null;
}