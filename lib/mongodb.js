import mongoose from 'mongoose';
import dns from 'node:dns';

// Set DNS servers to prevent querySrv ECONNREFUSED error on Windows/local networks
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  console.warn('Unable to set custom DNS servers:', e);
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Programmatically resolve SRV URI and TXT options to standard URI to bypass Windows Node DNS bug
async function resolveSrvUri(uri) {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  try {
    console.log('[MongoDNS] Resolving SRV records programmatically to bypass Windows Node DNS bug...');
    
    // Parse parts of the URI: mongodb+srv://<auth>@<host>/<db>?<options>
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+:[^@]+)@([^/]+)\/([^?]*)(.*)$/);
    if (!match) return uri;

    const [, auth, srvHost, db, query] = match;

    // Resolve SRV using a custom Resolver pointed at Google DNS to avoid local ISP blocks
    const resolver = new dns.Resolver();
    resolver.setServers(['8.8.8.8', '8.8.4.4']);

    const srvRecords = await new Promise((resolve, reject) => {
      resolver.resolveSrv(`_mongodb._tcp.${srvHost}`, (err, addresses) => {
        if (err) reject(err);
        else resolve(addresses);
      });
    });

    if (!srvRecords || srvRecords.length === 0) {
      throw new Error('No SRV records found');
    }

    const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',');

    // Resolve TXT record options (replicaSet name and authSource)
    let txtOptions = '';
    try {
      console.log('[MongoDNS] Resolving TXT records for replicaSet options...');
      const txtRecords = await new Promise((resolve, reject) => {
        resolver.resolveTxt(srvHost, (err, records) => {
          if (err) reject(err);
          else resolve(records);
        });
      });
      if (txtRecords && txtRecords.length > 0) {
        txtOptions = txtRecords.flat().join('&');
      }
    } catch (txtErr) {
      console.warn('[MongoDNS] TXT resolution failed, using fallback options:', txtErr.message);
    }
    
    // Merge options: TXT options, query params, and ssl=true
    const mergedOptions = [];
    if (txtOptions) {
      mergedOptions.push(txtOptions);
    }
    if (query && query.length > 1) {
      mergedOptions.push(query.substring(1)); // strip leading '?'
    }
    if (!mergedOptions.some(opt => opt.toLowerCase().includes('ssl='))) {
      mergedOptions.push('ssl=true');
    }

    const resolvedUri = `mongodb://${auth}@${hosts}/${db}?${mergedOptions.join('&')}`;
    
    console.log(`[MongoDNS] Successfully resolved SRV hosts [${srvRecords.length} hosts] & replicaSet parameters.`);
    return resolvedUri;
  } catch (error) {
    console.warn('[MongoDNS] SRV programmatic resolution failed, falling back to original URI:', error.message);
    return uri;
  }
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = resolveSrvUri(MONGODB_URI).then((resolvedUri) => {
      return mongoose.connect(resolvedUri, opts);
    }).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
