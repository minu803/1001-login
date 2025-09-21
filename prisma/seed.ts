import { PrismaClient, UserRole, ProductType, ProductStatus, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.$transaction([
    prisma.review.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.lessonProgress.deleteMany(),
    prisma.submission.deleteMany(),
    prisma.assignment.deleteMany(),
    prisma.lesson.deleteMany(),
    prisma.classEnrollment.deleteMany(),
    prisma.class.deleteMany(),
    prisma.bookmark.deleteMany(),
    prisma.readingProgress.deleteMany(),
    prisma.chapter.deleteMany(),
    prisma.story.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // Create users for each role
  console.log('👥 Creating users...');
  const users = await Promise.all([
    // Admin user
    prisma.user.create({
      data: {
        email: 'admin@1001stories.org',
        name: 'Admin User',
        role: UserRole.ADMIN,
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'User',
            location: 'Seoul, Korea',
            language: 'ko',
            timezone: 'Asia/Seoul',
          },
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.ENTERPRISE,
            status: SubscriptionStatus.ACTIVE,
            canAccessPremium: true,
            canDownloadPDF: true,
            canCreateClasses: true,
            maxStudents: 999,
            maxDownloads: 999,
          },
        },
      },
    }),

    // Teacher user
    prisma.user.create({
      data: {
        email: 'teacher@example.com',
        name: 'Sarah Johnson',
        role: UserRole.TEACHER,
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Sarah',
            lastName: 'Johnson',
            organization: 'Seoul International School',
            bio: 'Passionate educator with 10 years of experience teaching English literature.',
            location: 'Seoul, Korea',
            language: 'en',
            timezone: 'Asia/Seoul',
            teachingLevel: 'Middle School',
            subjects: ['English', 'Literature', 'Creative Writing'],
            studentCount: 45,
          },
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
            canAccessPremium: true,
            canDownloadPDF: true,
            canCreateClasses: true,
            maxStudents: 100,
            maxDownloads: 50,
          },
        },
      },
    }),

    // Institution user
    prisma.user.create({
      data: {
        email: 'institution@example.com',
        name: 'Global Learning Academy',
        role: UserRole.INSTITUTION,
        emailVerified: new Date(),
        profile: {
          create: {
            organization: 'Global Learning Academy',
            bio: 'Leading educational institution focused on global literacy.',
            location: 'New York, USA',
            language: 'en',
            timezone: 'America/New_York',
            studentCount: 500,
          },
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.ENTERPRISE,
            status: SubscriptionStatus.ACTIVE,
            canAccessPremium: true,
            canDownloadPDF: true,
            canCreateClasses: true,
            maxStudents: 500,
            maxDownloads: 200,
          },
        },
      },
    }),

    // Volunteer user
    prisma.user.create({
      data: {
        email: 'volunteer@example.com',
        name: 'Michael Chen',
        role: UserRole.VOLUNTEER,
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Michael',
            lastName: 'Chen',
            bio: 'Software developer volunteering to improve educational access.',
            location: 'San Francisco, USA',
            language: 'en',
            timezone: 'America/Los_Angeles',
            skills: ['Translation', 'Web Development', 'Content Creation'],
            availability: 'Weekends, 5-10 hours per week',
            experience: '3 years of volunteer work with educational nonprofits',
          },
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            canAccessPremium: false,
            canDownloadPDF: false,
            canCreateClasses: false,
            maxStudents: 0,
            maxDownloads: 10,
          },
        },
      },
    }),

    // Learner users
    prisma.user.create({
      data: {
        email: 'learner1@example.com',
        name: 'Emma Wilson',
        role: UserRole.LEARNER,
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Emma',
            lastName: 'Wilson',
            dateOfBirth: new Date('2010-05-15'),
            location: 'London, UK',
            language: 'en',
            timezone: 'Europe/London',
          },
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.FREE,
            status: SubscriptionStatus.ACTIVE,
            canAccessPremium: false,
            canDownloadPDF: false,
            canCreateClasses: false,
            maxStudents: 0,
            maxDownloads: 5,
          },
        },
      },
    }),

    prisma.user.create({
      data: {
        email: 'learner2@example.com',
        name: 'Jin Park',
        role: UserRole.LEARNER,
        emailVerified: new Date(),
        profile: {
          create: {
            firstName: 'Jin',
            lastName: 'Park',
            dateOfBirth: new Date('2011-08-22'),
            location: 'Seoul, Korea',
            language: 'ko',
            timezone: 'Asia/Seoul',
          },
        },
        subscription: {
          create: {
            plan: SubscriptionPlan.BASIC,
            status: SubscriptionStatus.ACTIVE,
            canAccessPremium: true,
            canDownloadPDF: true,
            canCreateClasses: false,
            maxStudents: 0,
            maxDownloads: 20,
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create categories
  console.log('📁 Creating categories...');
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Physical Books',
        slug: 'physical-books',
        description: 'Printed books and educational materials',
        parentId: null,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Digital Books',
        slug: 'digital-books',
        description: 'eBooks and digital reading materials',
        parentId: null,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Merchandise',
        slug: 'merchandise',
        description: 'Educational merchandise and accessories',
        parentId: null,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories`);

  // Create stories/books
  console.log('📚 Creating stories...');
  const teacher = users.find(u => u.email === 'teacher@example.com')!;
  const learner1 = users.find(u => u.email === 'learner1@example.com')!;
  
  const stories = await Promise.all([
    prisma.story.create({
      data: {
        isbn: '978-1-234567-89-0',
        title: 'The Little Fisherman',
        subtitle: 'A Tale of Courage from the Philippines',
        content: 'In a small village by the sea, young Miguel learned that true courage comes from helping others...',
        summary: 'A young boy learns about courage and perseverance while helping his father fish.',
        authorId: learner1.id,
        authorName: 'Maria Santos',
        authorAge: 12,
        authorLocation: 'Philippines',
        language: 'en',
        pageCount: 32,
        readingLevel: '8-12 years',
        readingTime: 8,
        category: ['Adventure', 'Cultural'],
        genres: ['Fiction', 'Adventure'],
        subjects: ['Courage', 'Family', 'Ocean'],
        tags: ['courage', 'family', 'ocean', 'philippines'],
        coverImage: '/images/stories/fisherman.jpg',
        isPremium: false,
        isPublished: true,
        publishedDate: new Date('2024-01-15'),
        publisher: '1001 Stories Press',
        viewCount: 245,
        likeCount: 89,
        rating: 4.8,
        featured: true,
        chapters: {
          create: [
            {
              chapterNumber: 1,
              title: 'The Morning Catch',
              content: 'Miguel woke up before dawn, as he did every morning...',
              readingTime: 3,
            },
            {
              chapterNumber: 2,
              title: 'The Storm',
              content: 'Dark clouds gathered on the horizon...',
              readingTime: 3,
            },
            {
              chapterNumber: 3,
              title: 'Homecoming',
              content: 'As the sun set, Miguel and his father returned...',
              readingTime: 2,
            },
          ],
        },
      },
    }),

    prisma.story.create({
      data: {
        isbn: '978-1-234567-90-1',
        title: 'Dancing with the Wind',
        subtitle: 'Nigerian Harvest Celebrations',
        content: 'In the heart of Nigeria, during harvest season, young Amara discovered the magic of traditional dance...',
        summary: 'A celebration of traditional dance and music in a Nigerian village.',
        authorId: learner1.id,
        authorName: 'Amara Okafor',
        authorAge: 10,
        authorLocation: 'Nigeria',
        language: 'en',
        pageCount: 28,
        readingLevel: '6-10 years',
        readingTime: 6,
        category: ['Cultural', 'Music'],
        genres: ['Fiction', 'Cultural'],
        subjects: ['Culture', 'Music', 'Dance'],
        tags: ['culture', 'music', 'celebration', 'nigeria'],
        coverImage: '/images/stories/dancing.jpg',
        isPremium: true,
        isPublished: true,
        publishedDate: new Date('2024-02-01'),
        publisher: '1001 Stories Press',
        price: 4.99,
        viewCount: 189,
        likeCount: 102,
        rating: 4.9,
        featured: true,
      },
    }),

    prisma.story.create({
      data: {
        title: 'The Magic Paintbrush',
        content: 'Li Wei discovered an old paintbrush in her grandmother\'s attic...',
        summary: 'A girl finds a magical paintbrush that brings her drawings to life.',
        authorId: teacher.id,
        authorName: 'Li Wei',
        authorAge: 11,
        authorLocation: 'China',
        language: 'en',
        pageCount: 36,
        readingLevel: '8-12 years',
        readingTime: 10,
        category: ['Fantasy', 'Art'],
        genres: ['Fantasy', 'Adventure'],
        subjects: ['Magic', 'Art', 'Creativity'],
        tags: ['magic', 'art', 'creativity', 'china'],
        coverImage: '/images/stories/paintbrush.jpg',
        isPremium: false,
        isPublished: true,
        publishedDate: new Date('2024-03-10'),
        viewCount: 302,
        likeCount: 156,
        rating: 4.7,
      },
    }),
  ]);

  console.log(`✅ Created ${stories.length} stories`);

  // Create products
  console.log('🛍️ Creating products...');
  const physicalBooksCategory = categories.find(c => c.slug === 'physical-books')!;
  const digitalBooksCategory = categories.find(c => c.slug === 'digital-books')!;
  
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'PB-001',
        type: ProductType.PHYSICAL_BOOK,
        title: 'The Little Fisherman - Hardcover',
        description: 'Beautiful hardcover edition of The Little Fisherman with full-color illustrations.',
        price: 19.99,
        compareAtPrice: 24.99,
        cost: 8.50,
        currency: 'USD',
        weight: 350,
        status: ProductStatus.ACTIVE,
        featured: true,
        categoryId: physicalBooksCategory.id,
        tags: ['book', 'hardcover', 'children'],
        creatorName: 'Maria Santos',
        creatorAge: 12,
        creatorLocation: 'Philippines',
        impactMetric: 'Books donated',
        impactValue: '1 book donated for every 5 sold',
        variants: {
          create: [
            {
              title: 'English Edition',
              sku: 'PB-001-EN',
              price: 19.99,
              inventoryQuantity: 100,
              attributes: { language: 'English' },
            },
            {
              title: 'Korean Edition',
              sku: 'PB-001-KO',
              price: 22.99,
              inventoryQuantity: 50,
              attributes: { language: 'Korean' },
            },
          ],
        },
        inventory: {
          create: {
            quantity: 150,
            reserved: 0,
            location: 'Main Warehouse',
            reorderPoint: 20,
            reorderQuantity: 50,
          },
        },
      },
    }),

    prisma.product.create({
      data: {
        sku: 'DB-001',
        type: ProductType.DIGITAL_BOOK,
        title: 'Dancing with the Wind - eBook',
        description: 'Digital edition with interactive features and audio narration.',
        price: 4.99,
        compareAtPrice: 7.99,
        currency: 'USD',
        status: ProductStatus.ACTIVE,
        featured: false,
        categoryId: digitalBooksCategory.id,
        tags: ['ebook', 'digital', 'children'],
        digitalFileUrl: '/downloads/dancing-with-wind.epub',
        downloadLimit: 5,
        creatorName: 'Amara Okafor',
        creatorAge: 10,
        creatorLocation: 'Nigeria',
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create classes
  console.log('🏫 Creating classes...');
  const teacherUser = users.find(u => u.email === 'teacher@example.com')!;
  
  const classes = await Promise.all([
    prisma.class.create({
      data: {
        code: 'ENG-101',
        name: 'Creative Writing Workshop',
        description: 'Learn to write compelling stories and express your creativity.',
        teacherId: teacherUser.id,
        subject: 'English',
        gradeLevel: 'Grade 6-8',
        schedule: {
          days: ['Monday', 'Wednesday', 'Friday'],
          time: '14:00-15:00',
        },
        startDate: new Date('2024-09-01'),
        endDate: new Date('2025-06-30'),
        maxStudents: 30,
        isActive: true,
        settings: {
          allowLateSubmissions: true,
          autoGrade: false,
        },
        lessons: {
          create: [
            {
              lessonNumber: 1,
              title: 'Introduction to Story Elements',
              objectives: ['Understand plot structure', 'Identify character types'],
              content: 'Today we will explore the basic elements of storytelling...',
              resources: { videos: [], documents: [], links: [] },
              duration: 60,
            },
            {
              lessonNumber: 2,
              title: 'Character Development',
              objectives: ['Create compelling characters', 'Write character descriptions'],
              content: 'Characters are the heart of any story...',
              resources: { videos: [], documents: [], links: [] },
              duration: 60,
            },
          ],
        },
        assignments: {
          create: [
            {
              title: 'Write Your First Story',
              description: 'Write a 500-word short story using the elements we learned.',
              type: 'WRITING',
              dueDate: new Date('2024-09-15'),
              points: 100,
              resources: [],
              requirements: {
                minWords: 500,
                maxWords: 800,
                includeElements: ['plot', 'character', 'setting'],
              },
            },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${classes.length} classes`);

  // Enroll learners in classes
  console.log('🎓 Creating enrollments...');
  const learners = users.filter(u => u.role === UserRole.LEARNER);
  const createdClass = classes[0];
  
  const enrollments = await Promise.all(
    learners.map(learner =>
      prisma.classEnrollment.create({
        data: {
          classId: createdClass.id,
          studentId: learner.id,
          status: 'ACTIVE',
          attendance: 95,
          progress: 30,
        },
      })
    )
  );

  console.log(`✅ Created ${enrollments.length} enrollments`);

  // Create some reading progress
  console.log('📖 Creating reading progress...');
  const story1 = stories[0];
  const learner = learners[0];
  
  await prisma.readingProgress.create({
    data: {
      userId: learner.id,
      storyId: story1.id,
      currentChapter: 2,
      currentPage: 15,
      percentComplete: 65,
      totalReadingTime: 12,
      lastReadAt: new Date(),
      startedAt: new Date('2024-12-01'),
    },
  });

  console.log('✅ Created reading progress');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Demo accounts created:');
  console.log('  Admin: admin@1001stories.org');
  console.log('  Teacher: teacher@example.com');
  console.log('  Institution: institution@example.com');
  console.log('  Volunteer: volunteer@example.com');
  console.log('  Learners: learner1@example.com, learner2@example.com');
  console.log('\n💡 All accounts use magic link authentication (no passwords)');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });