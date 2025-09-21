import { PrismaClient, ContentType } from '@prisma/client';
import { booksData } from './books-data';
import type { BookMetadata } from '../scripts/create-book-data';

const prisma = new PrismaClient();

// Type alias for backwards compatibility
type BookData = BookMetadata;

async function main() {
  console.log('📚 Starting Real Books Seed Process...');
  
  try {
    // 1. Clean existing book-related data
    console.log('🧹 Cleaning existing data...');
    await prisma.$transaction([
      // Clean in correct order due to foreign key constraints
      prisma.readingProgress.deleteMany(),
      prisma.review.deleteMany({ where: { contentType: 'BOOK' } }),
      prisma.bookmark.deleteMany(),
      prisma.activityLog.deleteMany({ where: { entity: 'BOOK' } }),
      prisma.shopProduct.deleteMany({ where: { type: 'DIGITAL_BOOK' } }),
      prisma.story.deleteMany({ where: { fullPdf: { not: null } } }), // Only delete books, not text stories
    ]);

    // 2. Get or create admin user
    let adminUser = await prisma.user.findFirst({
      where: { email: 'admin@1001stories.org' }
    });

    if (!adminUser) {
      console.log('👤 Creating admin user...');
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@1001stories.org',
          name: 'Admin User',
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
    }

    // 3. Create Story records for all books
    console.log('📖 Creating book records...');
    const createdBooks = await Promise.all(
      booksData.map(async (bookData, index) => {
        // Generate PDF URLs using the API route format
        const mainPdfUrl = `/api/pdf/books/${bookData.id}/main.pdf`;
        const samplePdfUrl = mainPdfUrl; // Same as main for now
        const frontCoverUrl = bookData.frontCoverFile ? `/api/pdf/books/${bookData.id}/front.pdf` : null;
        const backCoverUrl = bookData.backCoverFile ? `/api/pdf/books/${bookData.id}/back.pdf` : null;
        
        // Generate cover image path - ONLY use covers that actually exist on server
        // Verified list of books with actual cover.png files on server (generated 2025-08-25)
        const booksWithActualCovers = [
          'a-gril-come-to-stanford', 'angel-prayer', 'appreciation', 'check-point-eng', 'check-point-span', 'fatuma',
          'girl-with-a-hope-eng', 'greedy-fisherman', 'kakama-01', 'kakama-02', 'martha-01',
          'martha-02', 'martha-03', 'mirror', 'my-life-eng', 'my-life-p-urh-pecha', 'my-life-span',
          'neema-01', 'neema-02', 'neema-03', 'never-give-up', 'second-chance',
          'steet-boy-part01-span', 'street-boy-part02-eng', 'test4', 'the-eyes-of-the-sun',
          'the-indian-boy-s', 'the-story-of-a-thief-eng', 'the-three-boys-eng',
          'the-three-boys-span', 'who-is-real'
        ];
        const coverImageUrl = booksWithActualCovers.includes(bookData.id) 
          ? `/books/${bookData.id}/cover.png` 
          : '/images/placeholder-book.jpg';

        return prisma.story.create({
          data: {
            id: bookData.id,
            title: bookData.title,
            subtitle: bookData.subtitle,
            content: bookData.summary || '', // Use summary as content for books
            summary: bookData.summary,
            authorName: bookData.authorName,
            authorAge: bookData.authorAge,
            authorLocation: bookData.authorLocation,
            language: bookData.language,
            category: bookData.category,
            genres: bookData.genres,
            subjects: bookData.subjects,
            tags: bookData.tags,
            coverImage: coverImageUrl,
            fullPdf: mainPdfUrl,
            samplePdf: samplePdfUrl,
            pageCount: bookData.pageCount,
            readingLevel: bookData.ageRange,
            readingTime: Math.ceil(bookData.pageCount / 2), // Estimate 2 pages per minute
            isPremium: bookData.isPremium,
            price: bookData.isPremium ? 4.99 : 0.00,
            isPublished: true,
            publishedDate: new Date(),
            featured: !bookData.isPremium, // Free books are featured
            viewCount: Math.floor(Math.random() * 50) + 10,
            likeCount: Math.floor(Math.random() * 20) + 5,
            rating: 4.0 + Math.random() * 1.0, // Random rating between 4.0-5.0
            authorId: adminUser!.id,
            // Additional metadata
            createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random creation date within last 30 days
            updatedAt: new Date(),
          },
        });
      })
    );

    console.log(`✅ Created ${createdBooks.length} book records`);

    // 4. Create shop products for books with uploaded PDFs
    console.log('🛍️ Creating shop products...');
    
    // List of books with actual PDF files on server (uploaded)
    const booksWithPDFs = [
      'angel-prayer', 'appreciation', 'fatuma', 'greedy-fisherman', 'martha-01',
      'neema-01', 'neema-02', 'neema-03', 'never-give-up', 'second-chance',
      'test4', 'who-is-real'
    ];
    
    // Filter books to only those with uploaded PDFs
    const booksForShop = createdBooks.filter(book => booksWithPDFs.includes(book.id));
    console.log(`📚 Creating shop products for ${booksForShop.length} books with uploaded PDFs...`);
    
    const shopProducts = await Promise.all(
      booksForShop.map(async (book, index) => {
        return prisma.shopProduct.create({
          data: {
            sku: `BOOK-${String(index + 1).padStart(3, '0')}`,
            type: 'DIGITAL_BOOK',
            title: book.title,
            description: book.summary || book.title,
            shortDescription: `Digital version of "${book.title}" by ${book.authorName}`,
            price: book.isPremium ? 4.99 : 2.99,
            compareAtPrice: book.isPremium ? 7.99 : 4.99,
            currency: 'USD',
            bookId: book.id,
            downloadLimit: 5,
            accessDuration: book.isPremium ? null : 365,
            category: book.category,
            tags: book.tags,
            featured: !book.isPremium,
            thumbnailUrl: book.coverImage,
            images: [book.coverImage || '/images/placeholder-book.jpg'],
            creatorName: book.authorName,
            creatorAge: book.authorAge,
            creatorLocation: book.authorLocation,
            impactMetric: "Children reached",
            impactValue: book.isPremium ? "15+" : "8+",
            status: 'ACTIVE',
          },
        });
      })
    );

    console.log(`✅ Created ${shopProducts.length} shop products`);

    // 5. Create sample reading progress and bookmarks for demo users
    console.log('📊 Creating sample user data...');
    const demoUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['learner1@example.com', 'learner2@example.com', 'teacher@example.com']
        }
      }
    });

    // Add reading progress for free books that have PDFs
    const freeBooks = booksForShop.filter(book => !book.isPremium);
    for (const user of demoUsers) {
      for (const book of freeBooks.slice(0, 2)) { // First 2 free books
        await prisma.readingProgress.create({
          data: {
            userId: user.id,
            storyId: book.id,
            currentPage: Math.floor(Math.random() * book.pageCount! / 2) + 1,
            percentComplete: Math.random() * 50 + 10, // 10-60% complete
            totalReadingTime: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
            lastReadAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Within last week
          },
        });
      }
    }

    // Add bookmarks for books with PDFs
    for (const user of demoUsers) {
      const bookmarkedBooks = booksForShop.slice(0, Math.floor(Math.random() * 3) + 2); // 2-4 bookmarks
      for (const book of bookmarkedBooks) {
        await prisma.bookmark.create({
          data: {
            userId: user.id,
            storyId: book.id,
            createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000), // Within last 2 weeks
          },
        });
      }
    }

    // 6. Create sample reviews
    console.log('⭐ Creating sample reviews...');
    const reviewTexts = [
      { title: "Amazing story!", comment: "This book really touched my heart. The author did a wonderful job.", rating: 5 },
      { title: "Great read", comment: "Very inspiring and well-written for such a young author.", rating: 4 },
      { title: "Loved it", comment: "Beautiful story with a powerful message. Highly recommend!", rating: 5 },
      { title: "Inspiring", comment: "This story gave me hope and made me think differently.", rating: 4 },
      { title: "Wonderful", comment: "A truly moving story that stays with you long after reading.", rating: 5 },
    ];

    for (const user of demoUsers.slice(0, 2)) { // Only first 2 users leave reviews
      for (const book of booksForShop.slice(0, 5)) { // First 5 books with PDFs get reviews
        if (Math.random() > 0.3) { // 70% chance of review
          const reviewData = reviewTexts[Math.floor(Math.random() * reviewTexts.length)];
          await prisma.review.create({
            data: {
              userId: user.id,
              contentType: ContentType.BOOK,
              contentId: book.id,
              rating: reviewData.rating,
              title: reviewData.title,
              comment: reviewData.comment,
              createdAt: new Date(Date.now() - Math.random() * 21 * 24 * 60 * 60 * 1000), // Within last 3 weeks
            },
          });
        }
      }
    }

    // 7. Update book ratings based on reviews
    console.log('🔄 Updating book ratings...');
    for (const book of createdBooks) {
      const reviews = await prisma.review.findMany({
        where: { contentId: book.id, contentType: ContentType.BOOK },
        select: { rating: true },
      });

      if (reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
        await prisma.story.update({
          where: { id: book.id },
          data: { rating: Math.round(averageRating * 10) / 10 }, // Round to 1 decimal place
        });
      }
    }

    console.log('🎉 Real Books Seed Completed Successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`  📚 Books created: ${createdBooks.length}`);
    console.log(`  📁 Books with PDFs: ${booksForShop.length}`);
    console.log(`  🆓 Free books: ${createdBooks.filter(b => !b.isPremium).length}`);
    console.log(`  💎 Premium books: ${createdBooks.filter(b => b.isPremium).length}`);
    console.log(`  🛍️ Shop products: ${shopProducts.length}`);
    console.log(`  🌍 Languages: ${[...new Set(booksData.map(b => b.language))].join(', ')}`);
    console.log('');
    console.log('🎯 Free Preview Books (Demo):');
    booksForShop.filter(b => !b.isPremium).forEach(book => {
      console.log(`  - ${book.title} (${book.id})`);
    });
    console.log('');
    console.log('💡 Next Steps:');
    console.log('  1. Upload PDF files to public/books/ directory on server');
    console.log('  2. Update demo page to use real books');
    console.log('  3. Test book access and PDF loading');
    console.log('  4. Deploy changes to production');
    console.log('');
    console.log('🌐 Access Points:');
    console.log('  - Library: http://localhost:3000/library');
    console.log('  - Demo Library: http://localhost:3000/demo/library');
    console.log('  - Shop: http://localhost:3000/shop');
    
  } catch (error) {
    console.error('❌ Error in real books seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding real books:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });