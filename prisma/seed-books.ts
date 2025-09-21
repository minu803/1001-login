import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface BookData {
  title: string;
  subtitle?: string;
  summary: string;
  authorName: string;
  authorAlias: string;
  authorAge?: number;
  authorLocation: string;
  language: string;
  ageRange: string;
  category: string[];
  genres: string[];
  subjects: string[];
  tags: string[];
  pdfPath: string;
  isPremium: boolean;
  previewPages: number;
  pageCount: number;
  downloadAllowed: boolean;
  printAllowed: boolean;
}

// PDF 파일 데이터 정의
const booksData: BookData[] = [
  {
    title: "My Friend Phong",
    subtitle: "A Story of Friendship",
    summary: "A heartwarming tale about friendship and cultural understanding between children from different backgrounds.",
    authorName: "Young Author",
    authorAlias: "Little Writer",
    authorAge: 10,
    authorLocation: "Vietnam",
    language: "en",
    ageRange: "6-10",
    category: ["Friendship", "Cultural"],
    genres: ["Fiction", "Children's Literature"],
    subjects: ["Friendship", "Culture", "Understanding"],
    tags: ["friendship", "culture", "children", "vietnam"],
    pdfPath: "uploads/books/My friend Phong.pdf",
    isPremium: false,
    previewPages: 3,
    pageCount: 20,
    downloadAllowed: true,
    printAllowed: true,
  },
  {
    title: "I Love Wando",
    subtitle: "Beautiful Island Adventures",
    summary: "Discover the beautiful island of Wando through the eyes of a young explorer who shares the wonders of this special place.",
    authorName: "Island Child",
    authorAlias: "Wando Explorer",
    authorAge: 12,
    authorLocation: "Wando, Korea",
    language: "en",
    ageRange: "8-12",
    category: ["Adventure", "Nature"],
    genres: ["Non-fiction", "Adventure"],
    subjects: ["Nature", "Island Life", "Exploration"],
    tags: ["wando", "island", "nature", "korea", "adventure"],
    pdfPath: "uploads/books/I love Wando.pdf",
    isPremium: true,
    previewPages: 5,
    pageCount: 24,
    downloadAllowed: false,
    printAllowed: false,
  },
  {
    title: "Let's Run!",
    subtitle: "A Sports Adventure",
    summary: "An energetic story about the joy of running and staying active. Follow our young protagonist as they discover the fun of sports and exercise.",
    authorName: "Athletic Kid",
    authorAlias: "Running Star",
    authorAge: 9,
    authorLocation: "Active Community",
    language: "en",
    ageRange: "5-9",
    category: ["Sports", "Health"],
    genres: ["Fiction", "Sports"],
    subjects: ["Exercise", "Health", "Determination"],
    tags: ["running", "sports", "health", "exercise", "active"],
    pdfPath: "uploads/books/let's run!.pdf",
    isPremium: false,
    previewPages: 4,
    pageCount: 18,
    downloadAllowed: true,
    printAllowed: true,
  },
  {
    title: "My Friend Puru",
    subtitle: "Adventures with Puru",
    summary: "Meet Puru, a delightful character who brings joy and laughter to everyone around. A story about friendship and the magic of imagination.",
    authorName: "Creative Child",
    authorAlias: "Puru's Friend",
    authorAge: 11,
    authorLocation: "Imaginative Land",
    language: "en",
    ageRange: "7-11",
    category: ["Fantasy", "Friendship"],
    genres: ["Fiction", "Fantasy"],
    subjects: ["Imagination", "Friendship", "Magic"],
    tags: ["puru", "friendship", "imagination", "magic", "adventure"],
    pdfPath: "uploads/books/my friend puru.pdf",
    isPremium: true,
    previewPages: 3,
    pageCount: 22,
    downloadAllowed: false,
    printAllowed: true,
  },
];

async function copyPdfToPublic(sourcePath: string, filename: string): Promise<string> {
  try {
    // 대상 디렉토리 생성
    const publicPdfDir = path.join(process.cwd(), 'public', 'pdfs');
    if (!fs.existsSync(publicPdfDir)) {
      fs.mkdirSync(publicPdfDir, { recursive: true });
    }

    // 파일 복사
    const destinationPath = path.join(publicPdfDir, filename);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`✅ Copied PDF: ${filename}`);
      return `/pdfs/${filename}`;
    } else {
      console.warn(`⚠️ PDF file not found: ${sourcePath}`);
      return `/pdfs/${filename}`; // 경로는 반환하되 파일은 없음
    }
  } catch (error) {
    console.error(`❌ Error copying PDF ${filename}:`, error);
    return `/pdfs/${filename}`;
  }
}

async function createShopProducts(books: any[]) {
  console.log('🛍️ Creating shop products for books...');
  
  const products = await Promise.all(
    books.map(async (book, index) => {
      return prisma.shopProduct.create({
        data: {
          sku: `BOOK-${String(index + 1).padStart(3, '0')}`,
          type: 'DIGITAL_BOOK',
          title: book.title,
          description: book.summary,
          shortDescription: `Digital version of "${book.title}" by ${book.authorAlias}`,
          price: book.isPremium ? 4.99 : 2.99,
          compareAtPrice: book.isPremium ? 7.99 : 4.99,
          currency: 'USD',
          bookId: book.id,
          downloadLimit: book.downloadAllowed ? 5 : 0,
          accessDuration: book.isPremium ? null : 365, // Free books expire in 1 year
          category: book.category,
          tags: book.tags,
          featured: !book.isPremium, // Free books are featured
          thumbnailUrl: book.coverImage,
          creatorName: book.authorAlias,
          creatorAge: book.authorAge,
          creatorLocation: book.authorLocation,
          impactMetric: "Children reached",
          impactValue: book.isPremium ? "10+" : "5+",
          status: 'ACTIVE',
        },
      });
    })
  );

  console.log(`✅ Created ${products.length} shop products`);
  return products;
}

async function main() {
  console.log('📚 Starting Book seed with PDF files...');

  try {
    // 1. 기존 새로운 모델 데이터 정리
    console.log('🧹 Cleaning existing Book data...');
    await prisma.$transaction([
      prisma.publication.deleteMany(),
      prisma.entitlement.deleteMany(),
      prisma.shopProduct.deleteMany(),
      prisma.book.deleteMany(),
    ]);

    // 2. 관리자 사용자 확인 (시드에서 생성된 사용자 사용)
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

    // 3. Book 데이터 생성
    console.log('📖 Creating books...');
    const books = await Promise.all(
      booksData.map(async (bookData) => {
        // PDF 파일을 public 폴더로 복사
        const filename = path.basename(bookData.pdfPath);
        const pdfKey = await copyPdfToPublic(bookData.pdfPath, filename);

        // 커버 이미지 URL 생성 (실제 경로 사용)
        const bookSlug = bookData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const coverImage = `/books/${bookSlug}/cover.png`;

        return prisma.book.create({
          data: {
            title: bookData.title,
            subtitle: bookData.subtitle,
            summary: bookData.summary,
            authorName: bookData.authorName,
            authorAlias: bookData.authorAlias,
            authorAge: bookData.authorAge,
            authorLocation: bookData.authorLocation,
            language: bookData.language,
            ageRange: bookData.ageRange,
            category: bookData.category,
            genres: bookData.genres,
            subjects: bookData.subjects,
            tags: bookData.tags,
            coverImage: coverImage,
            pdfKey: pdfKey,
            pageCount: bookData.pageCount,
            previewPages: bookData.previewPages,
            drm: {
              watermark: bookData.isPremium,
              downloadAllowed: bookData.downloadAllowed,
              printAllowed: bookData.printAllowed,
            },
            downloadAllowed: bookData.downloadAllowed,
            printAllowed: bookData.printAllowed,
            isPublished: true,
            publishedAt: new Date(),
            isPremium: bookData.isPremium,
            price: bookData.isPremium ? 4.99 : 2.99,
            currency: 'USD',
            visibility: 'PUBLIC',
            viewCount: Math.floor(Math.random() * 100) + 10,
            downloadCount: Math.floor(Math.random() * 20),
            rating: 4.0 + Math.random() * 1.0, // 4.0-5.0 랜덤 평점
          },
        });
      })
    );

    console.log(`✅ Created ${books.length} books`);

    // 4. Shop 상품 생성
    const products = await createShopProducts(books);

    // 5. Publication 레코드 생성 (승인→라이브러리 반영)
    console.log('📋 Creating publications...');
    const publications = await Promise.all(
      books.map((book) =>
        prisma.publication.create({
          data: {
            bookId: book.id,
            visibility: 'PUBLIC',
            isPremium: book.isPremium,
            unlockPolicy: book.isPremium ? 'PURCHASE' : 'FREE',
            price: book.price,
            currency: book.currency,
            version: 1,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            publishedBy: adminUser!.id,
            featured: !book.isPremium, // Free books are featured
            category: book.category,
            tags: book.tags,
            sortOrder: book.isPremium ? 1 : 0, // Free books first
          },
        })
      )
    );

    console.log(`✅ Created ${publications.length} publications`);

    // 6. 무료 책에 대한 기본 권한 부여 (예시)
    console.log('🔑 Creating sample entitlements...');
    const freeBooks = books.filter(book => !book.isPremium);
    
    // 기존 사용자들에게 무료 책 권한 부여
    const sampleUsers = await prisma.user.findMany({
      where: {
        email: {
          in: ['learner1@example.com', 'learner2@example.com', 'teacher@example.com']
        }
      }
    });

    const entitlements = [];
    for (const user of sampleUsers) {
      for (const book of freeBooks) {
        entitlements.push(
          await prisma.entitlement.create({
            data: {
              userId: user.id,
              bookId: book.id,
              type: 'FREE_ACCESS',
              scope: 'BOOK',
              grantReason: 'free_book',
              grantedAt: new Date(),
              isActive: true,
            },
          })
        );
      }
    }

    console.log(`✅ Created ${entitlements.length} entitlements`);

    console.log('\n🎉 Book seed completed successfully!');
    console.log('\n📚 Books created:');
    books.forEach((book, index) => {
      console.log(`  ${index + 1}. ${book.title} (${book.isPremium ? 'Premium' : 'Free'})`);
    });
    
    console.log('\n🛍️ Shop products created:');
    products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.title} - $${product.price}`);
    });

    console.log('\n💡 Access the books at:');
    console.log('  - Library: http://localhost:3000/library');
    console.log('  - Shop: http://localhost:3000/shop');

  } catch (error) {
    console.error('❌ Error in book seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Error seeding books:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });