import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("demo1234", 10);
  const user = await prisma.user.upsert({
    where: { email: "demo@skoolpulse.com" },
    update: {},
    create: {
      email: "demo@skoolpulse.com",
      password: hash,
    },
  });

  let community = await prisma.community.findFirst({
    where: { userId: user.id, name: "Demo Skool Community" },
  });
  if (!community) {
    community = await prisma.community.create({
      data: {
        name: "Demo Skool Community",
        skoolUrl: "https://www.skool.com/demo",
        timezone: "America/New_York",
        planType: "Paid",
        hasTiers: true,
        userId: user.id,
      },
    });
  }

  const cId = community.id;

  const existingMetrics = await prisma.weeklyMetric.count({ where: { communityId: cId } });
  if (existingMetrics === 0) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    await prisma.weeklyMetric.createMany({
      data: [
      {
        communityId: cId,
        periodStart: twoWeeksAgo,
        periodEnd: new Date(twoWeeksAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
        newMembers: 12,
        totalMembers: 148,
        postsCreated: 24,
        commentsCreated: 89,
        activeMembers: 45,
        churnedMembers: 2,
        startingPaidMembers: 120,
        upgradeConversions: 3,
        costPerJoin: 8.5,
        callsBooked: 2,
        revenue: 297,
      },
      {
        communityId: cId,
        periodStart: weekAgo,
        periodEnd: new Date(),
        newMembers: 8,
        totalMembers: 156,
        postsCreated: 18,
        commentsCreated: 72,
        activeMembers: 52,
        churnedMembers: 1,
        startingPaidMembers: 125,
        upgradeConversions: 2,
        costPerJoin: 9.0,
        callsBooked: 1,
        revenue: 198,
      },
    ],
    });
  }

  const existingPulses = await prisma.weeklyPulse.count({ where: { communityId: cId } });
  if (existingPulses === 0) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    await prisma.weeklyPulse.createMany({
    data: [
      {
        communityId: cId,
        weekStart: weekAgo,
        newMembers: 8,
        churnedMembers: 1,
        posts: 18,
        comments: 72,
        notableWins: "Launched new onboarding thread. 2 members booked discovery calls.",
        topQuestions: "How do I get access to the templates? When is the next live Q&A?",
        testNextWeek: "Pin a weekly wins thread; A/B test subject line for re-engagement email.",
      },
    ],
    });
  }

  const existingChurn = await prisma.churnEvent.count({ where: { communityId: cId } });
  if (existingChurn === 0) {
    const churnDate = new Date();
    churnDate.setDate(churnDate.getDate() - 3);
    await prisma.churnEvent.createMany({
      data: [
      {
        communityId: cId,
        memberIdOrName: "Alex R.",
        status: "churned",
        churnDate,
        churnReason: "too_busy",
        notes: "Asked for pause, may return",
        plan: "premium",
        source: "organic",
      },
      {
        communityId: cId,
        memberIdOrName: "Sam T.",
        status: "churned",
        churnDate: new Date(churnDate.getTime() - 5 * 24 * 60 * 60 * 1000),
        churnReason: "not_seeing_value",
        plan: "premium",
        source: "ads",
      },
    ],
    });
  }

  console.log("Seed complete. Demo user: demo@skoolpulse.com / demo1234");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
