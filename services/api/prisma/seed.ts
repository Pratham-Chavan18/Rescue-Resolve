import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Production Seeding Protection Guard ────────────────────────────────────

function extractDatabaseHost(databaseUrl: string): string {
  if (!databaseUrl) return '';
  try {
    const match = databaseUrl.match(/@([^/:?#]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const parsed = new URL(databaseUrl.replace(/^postgres(ql)?:\/\//, 'http://'));
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

function maskHost(host: string): string {
  if (!host) return 'unknown';
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return host;
  }
  const parts = host.split('.');
  if (parts.length > 2) {
    const first = parts[0] ?? '';
    const masked = first.length > 3 ? `${first.slice(0, 2)}***` : '***';
    return [masked, ...parts.slice(1)].join('.');
  }
  return host;
}

function isLocalhostHost(host: string): boolean {
  const lower = (host || '').toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '0.0.0.0' ||
    lower === '::1' ||
    lower.endsWith('.local')
  );
}

function validateSeedTarget(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl = env['DATABASE_URL'];
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  const host = extractDatabaseHost(databaseUrl);
  const isLocal = isLocalhostHost(host);
  const maskedHost = maskHost(host);

  const seedTarget = (env['SEED_TARGET'] || '').trim().toLowerCase();
  const confirmProd = (env['CONFIRM_PRODUCTION_SEED'] || '').trim();

  if (seedTarget === 'production') {
    if (confirmProd !== 'YES_SEED_DEMO_DATA') {
      throw new Error(
        'Production seeding aborted: CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA is required when SEED_TARGET=production.',
      );
    }
    if (isLocal) {
      throw new Error(
        `Production seeding rejected: SEED_TARGET is 'production' but database host is localhost/loopback (${host}).`,
      );
    }
    return {
      isProduction: true,
      targetHost: host,
      maskedHost,
    };
  }

  // Ambiguous guard: If connecting to a remote host without explicitly declaring SEED_TARGET=production
  if (!isLocal && seedTarget !== 'local') {
    throw new Error(
      `Remote database target detected (${maskedHost}). To seed a remote/production database, you must explicitly set SEED_TARGET=production and CONFIRM_PRODUCTION_SEED=YES_SEED_DEMO_DATA.`,
    );
  }

  return {
    isProduction: false,
    targetHost: host,
    maskedHost,
  };
}

// ─── Demo users (CONSTRAINTS §4.14 — synthetic only) ─────────────────────────
// Phones use 90000 0000x pattern; OTP is always 1234 (DECISIONS D10)

async function main() {
  const validation = validateSeedTarget();

  console.log(`🌱 Seeding database [Environment: ${validation.isProduction ? 'PRODUCTION' : 'LOCAL'}]`);
  console.log(`🎯 Target Host: ${validation.maskedHost}`);

  // 1. Upsert synthetic demo users
  const customer = await prisma.user.upsert({
    where: { phone: '9000000001' },
    update: {},
    create: {
      phone: '9000000001',
      role: 'customer',
      name: 'Arjun Mehta',
      upiMasked: 'UPI ·· 4242',
    },
  });

  const restaurantUser = await prisma.user.upsert({
    where: { phone: '9000000002' },
    update: {},
    create: {
      phone: '9000000002',
      role: 'restaurant',
      name: 'Spice Garden Manager',
    },
  });

  const riderUser = await prisma.user.upsert({
    where: { phone: '9000000003' },
    update: {},
    create: {
      phone: '9000000003',
      role: 'rider',
      name: 'Ravi Kumar',
    },
  });

  const agentUser = await prisma.user.upsert({
    where: { phone: '9000000004' },
    update: {},
    create: {
      phone: '9000000004',
      role: 'agent',
      name: 'Priya Sharma',
    },
  });

  // 2. Demo restaurants
  const restaurant1 = await prisma.restaurant.upsert({
    where: { id: 'rest-spice-garden' },
    update: {},
    create: {
      id: 'rest-spice-garden',
      name: 'Spice Garden',
      cuisine: 'Indian',
      vegOnly: false,
      lat: 12.9716,
      lng: 77.5946,
      issueRate: 0.04,
      userId: restaurantUser.id,
    },
  });

  const restaurant2 = await prisma.restaurant.upsert({
    where: { id: 'rest-curry-house' },
    update: {},
    create: {
      id: 'rest-curry-house',
      name: 'Curry House',
      cuisine: 'Indian',
      vegOnly: false,
      lat: 12.974,
      lng: 77.591,
      issueRate: 0.02,
    },
  });

  // replacement candidate — nearby, same cuisine
  await prisma.restaurant.upsert({
    where: { id: 'rest-indian-kitchen' },
    update: {},
    create: {
      id: 'rest-indian-kitchen',
      name: 'Indian Kitchen',
      cuisine: 'Indian',
      vegOnly: false,
      lat: 12.9725,
      lng: 77.5952,
      issueRate: 0.01,
    },
  });

  // 3. Demo menu items with deterministic IDs (guarantees idempotency on repeated seed runs)
  const menuItems = [
    // Spice Garden
    { id: 'menu-spice-1', restaurantId: 'rest-spice-garden', name: 'Dal Makhani', pricePaise: 22000, isVeg: true, category: 'Main Course' },
    { id: 'menu-spice-2', restaurantId: 'rest-spice-garden', name: 'Chicken Biryani', pricePaise: 28000, isVeg: false, category: 'Biryani' },
    { id: 'menu-spice-3', restaurantId: 'rest-spice-garden', name: 'Paneer Butter Masala', pricePaise: 24000, isVeg: true, category: 'Main Course' },
    { id: 'menu-spice-4', restaurantId: 'rest-spice-garden', name: 'Garlic Naan', pricePaise: 4000, isVeg: true, category: 'Bread' },
    { id: 'menu-spice-5', restaurantId: 'rest-spice-garden', name: 'Raita', pricePaise: 4500, isVeg: true, category: 'Sides' },
    // Curry House
    { id: 'menu-curry-1', restaurantId: 'rest-curry-house', name: 'Dal Tadka', pricePaise: 20000, isVeg: true, category: 'Main Course' },
    { id: 'menu-curry-2', restaurantId: 'rest-curry-house', name: 'Chicken Curry', pricePaise: 26000, isVeg: false, category: 'Main Course' },
    { id: 'menu-curry-3', restaurantId: 'rest-curry-house', name: 'Butter Naan', pricePaise: 3500, isVeg: true, category: 'Bread' },
    // Indian Kitchen
    { id: 'menu-indian-1', restaurantId: 'rest-indian-kitchen', name: 'Dal Fry', pricePaise: 19000, isVeg: true, category: 'Main Course' },
    { id: 'menu-indian-2', restaurantId: 'rest-indian-kitchen', name: 'Chicken Tikka', pricePaise: 30000, isVeg: false, category: 'Starter' },
    { id: 'menu-indian-3', restaurantId: 'rest-indian-kitchen', name: 'Chapati', pricePaise: 3000, isVeg: true, category: 'Bread' },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  // 4. Demo rider
  const rider = await prisma.rider.upsert({
    where: { id: 'rider-ravi' },
    update: {},
    create: {
      id: 'rider-ravi',
      name: 'Ravi Kumar',
      lat: 12.9718,
      lng: 77.5944,
      status: 'on_delivery',
      userId: riderUser.id,
    },
  });

  // 5. Live demo order (customer's active order)
  const now = new Date();
  const promisedAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now

  const liveOrder = await prisma.order.upsert({
    where: { id: 'order-demo-live' },
    update: {}, // IDEMPOTENCY: Do NOT reset status or promisedAt if order is already in flight!
    create: {
      id: 'order-demo-live',
      userId: customer.id,
      restaurantId: restaurant1.id,
      riderId: rider.id,
      status: 'rider_assigned',
      totalPaise: 58500,          // ₹585 — well within ₹1,500 auto-resolve cap
      deliveryFeePaise: 4000,     // ₹40
      promisedAt,
      address: '14, Indiranagar, Bengaluru',
    },
  });

  // Deterministic order items for live order
  const liveOrderItems = [
    { id: 'item-demo-live-1', orderId: liveOrder.id, name: 'Dal Makhani', pricePaise: 22000, qty: 1, isVeg: true },
    { id: 'item-demo-live-2', orderId: liveOrder.id, name: 'Chicken Biryani', pricePaise: 28000, qty: 1, isVeg: false },
    { id: 'item-demo-live-3', orderId: liveOrder.id, name: 'Garlic Naan', pricePaise: 4000, qty: 1, isVeg: true },
    { id: 'item-demo-live-4', orderId: liveOrder.id, name: 'Raita', pricePaise: 4500, qty: 1, isVeg: true },
  ];

  for (const item of liveOrderItems) {
    await prisma.orderItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  // Deterministic initial order events (never duplicate on re-runs)
  const initialLiveEvents = [
    { id: 'evt-demo-live-accepted', orderId: liveOrder.id, type: 'accepted', payload: {}, at: new Date(now.getTime() - 12 * 60000) },
    { id: 'evt-demo-live-packed', orderId: liveOrder.id, type: 'packed', payload: {}, at: new Date(now.getTime() - 8 * 60000) },
    { id: 'evt-demo-live-rider-assigned', orderId: liveOrder.id, type: 'rider_assigned', payload: { riderId: rider.id }, at: new Date(now.getTime() - 5 * 60000) },
  ];

  for (const evt of initialLiveEvents) {
    await prisma.orderEvent.upsert({
      where: { id: evt.id },
      update: {},
      create: evt,
    });
  }

  // Initial order health record (do not overwrite active simulation state if already exists)
  await prisma.orderHealth.upsert({
    where: { orderId: liveOrder.id },
    update: {},
    create: {
      orderId: liveOrder.id,
      state: 'on_track',
      etaAt: promisedAt,
    },
  });

  // 6. Completed order for Resolve testing
  const completedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  const completedPromised = new Date(completedAt.getTime() - 10 * 60 * 1000);

  const completedOrder = await prisma.order.upsert({
    where: { id: 'order-demo-completed' },
    update: {},
    create: {
      id: 'order-demo-completed',
      userId: customer.id,
      restaurantId: restaurant2.id,
      status: 'delivered',
      totalPaise: 33500,
      deliveryFeePaise: 4000,
      promisedAt: completedPromised,
      deliveredAt: completedAt,
      address: '14, Indiranagar, Bengaluru',
    },
  });

  const completedOrderItems = [
    { id: 'item-demo-comp-1', orderId: completedOrder.id, name: 'Dal Tadka', pricePaise: 20000, qty: 1, isVeg: true },
    { id: 'item-demo-comp-2', orderId: completedOrder.id, name: 'Butter Naan', pricePaise: 3500, qty: 2, isVeg: true },
    { id: 'item-demo-comp-3', orderId: completedOrder.id, name: 'Chicken Curry', pricePaise: 26000, qty: 0, isVeg: false }, // "Missing item" demo
  ];

  for (const item of completedOrderItems) {
    await prisma.orderItem.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  const initialCompEvents = [
    { id: 'evt-demo-comp-placed', orderId: completedOrder.id, type: 'placed', payload: {}, at: new Date(completedPromised.getTime() - 30 * 60000) },
    { id: 'evt-demo-comp-accepted', orderId: completedOrder.id, type: 'accepted', payload: {}, at: new Date(completedPromised.getTime() - 25 * 60000) },
    { id: 'evt-demo-comp-delivered', orderId: completedOrder.id, type: 'delivered', payload: {}, at: completedAt },
  ];

  for (const evt of initialCompEvents) {
    await prisma.orderEvent.upsert({
      where: { id: evt.id },
      update: {},
      create: evt,
    });
  }

  console.log('✅ Seed complete.');
  console.log('   Customer:   9000000001 / OTP 1234');
  console.log('   Restaurant: 9000000002 / OTP 1234');
  console.log('   Rider:      9000000003 / OTP 1234');
  console.log('   Agent:      9000000004 / OTP 1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
