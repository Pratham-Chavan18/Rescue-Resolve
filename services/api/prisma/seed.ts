import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Demo users (CONSTRAINTS §4.14 — synthetic only) ─────────────────────────
// Phones use 90000 0000x pattern; OTP is always 1234 (DECISIONS D10)

async function main() {
  console.log('🌱 Seeding database...');

  // Upsert demo users
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

  // ── Demo restaurants ────────────────────────────────────────────────────────

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
      menuItems: {
        create: [
          { name: 'Dal Makhani', pricePaise: 22000, isVeg: true, category: 'Main Course' },
          { name: 'Chicken Biryani', pricePaise: 28000, isVeg: false, category: 'Biryani' },
          { name: 'Paneer Butter Masala', pricePaise: 24000, isVeg: true, category: 'Main Course' },
          { name: 'Garlic Naan', pricePaise: 4000, isVeg: true, category: 'Bread' },
          { name: 'Raita', pricePaise: 4500, isVeg: true, category: 'Sides' },
        ],
      },
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
      menuItems: {
        create: [
          { name: 'Dal Tadka', pricePaise: 20000, isVeg: true, category: 'Main Course' },
          { name: 'Chicken Curry', pricePaise: 26000, isVeg: false, category: 'Main Course' },
          { name: 'Butter Naan', pricePaise: 3500, isVeg: true, category: 'Bread' },
        ],
      },
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
      menuItems: {
        create: [
          { name: 'Dal Fry', pricePaise: 19000, isVeg: true, category: 'Main Course' },
          { name: 'Chicken Tikka', pricePaise: 30000, isVeg: false, category: 'Starter' },
          { name: 'Chapati', pricePaise: 3000, isVeg: true, category: 'Bread' },
        ],
      },
    },
  });

  // ── Demo rider ───────────────────────────────────────────────────────────────

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

  // ── Live demo order (customer's active order) ─────────────────────────────

  const now = new Date();
  const promisedAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min from now

  const liveOrder = await prisma.order.upsert({
    where: { id: 'order-demo-live' },
    update: {
      status: 'rider_assigned',
      promisedAt,
      updatedAt: now,
    },
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
      items: {
        create: [
          { name: 'Dal Makhani', pricePaise: 22000, qty: 1, isVeg: true },
          { name: 'Chicken Biryani', pricePaise: 28000, qty: 1, isVeg: false },
          { name: 'Garlic Naan', pricePaise: 4000, qty: 1, isVeg: true },
          { name: 'Raita', pricePaise: 4500, qty: 1, isVeg: true },
        ],
      },
    },
  });

  // Create initial order events
  await prisma.orderEvent.createMany({
    skipDuplicates: true,
    data: [
      { orderId: liveOrder.id, type: 'accepted', payload: {}, at: new Date(now.getTime() - 12 * 60000) },
      { orderId: liveOrder.id, type: 'packed', payload: {}, at: new Date(now.getTime() - 8 * 60000) },
      { orderId: liveOrder.id, type: 'rider_assigned', payload: { riderId: rider.id }, at: new Date(now.getTime() - 5 * 60000) },
    ],
  });

  // Create initial health record
  await prisma.orderHealth.upsert({
    where: { orderId: liveOrder.id },
    update: { etaAt: promisedAt },
    create: {
      orderId: liveOrder.id,
      state: 'on_track',
      etaAt: promisedAt,
    },
  });

  // ── Completed order for Resolve testing ────────────────────────────────────

  const completedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  const completedPromised = new Date(completedAt.getTime() - 10 * 60 * 1000);

  await prisma.order.upsert({
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
      items: {
        create: [
          { name: 'Dal Tadka', pricePaise: 20000, qty: 1, isVeg: true },
          { name: 'Butter Naan', pricePaise: 3500, qty: 2, isVeg: true },
          { name: 'Chicken Curry', pricePaise: 26000, qty: 0, isVeg: false }, // This one was "missing" in demo
        ],
      },
    },
  });

  console.log('✅ Seed complete.');
  console.log('   Customer:   9000000001 / OTP 1234');
  console.log('   Restaurant: 9000000002 / OTP 1234');
  console.log('   Rider:      9000000003 / OTP 1234');
  console.log('   Agent:      9000000004 / OTP 1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
