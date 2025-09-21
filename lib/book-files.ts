export interface BookFiles {
  main: string | null;
  frontCover: string | null;
  backCover: string | null;
  bookId: string;
  folderName: string;
  thumbnailPage?: number;
  previewPageLimit?: number;
  metadata?: {
    hasMainPdf?: boolean;
    hasFrontCover?: boolean;
    hasBackCover?: boolean;
    isbn?: string;
    price?: number;
    publicationDate?: string;
  };
}

export interface BookFileConfig {
  baseDir: string;
  publicUrl: string;
}

// Default configuration for book files
const DEFAULT_CONFIG: BookFileConfig = {
  baseDir: '/books',
  publicUrl: '/api/pdf/books'
};

/**
 * Normalize book folder name from various formats
 * Examples: "01_ Neema_01" -> "neema-01", "02_ Neema_02" -> "neema-02"
 */
export function normalizeBookFolderName(originalName: string): string {
  return originalName
    .toLowerCase()
    .replace(/^\d+_?\s*/, '') // Remove leading numbers and underscores
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
}

/**
 * Generate book ID from folder name
 */
export function generateBookId(folderName: string): string {
  return normalizeBookFolderName(folderName);
}

/**
 * Resolve book file paths for a given book (client-side only)
 */
export function resolveBookFiles(
  bookId: string, 
  config: Partial<BookFileConfig> = {},
  metadata?: any
): BookFiles {
  const { publicUrl } = { ...DEFAULT_CONFIG, ...config };
  
  // In browser, we construct API URLs
  const result: BookFiles = {
    main: `${publicUrl}/${bookId}/main.pdf`,
    frontCover: `${publicUrl}/${bookId}/front.pdf`,
    backCover: `${publicUrl}/${bookId}/back.pdf`,
    bookId,
    folderName: bookId,
    thumbnailPage: metadata?.thumbnailPage || 1,
    previewPageLimit: metadata?.previewPageLimit || 5,
    metadata: {
      hasMainPdf: metadata?.hasMainPdf || true,
      hasFrontCover: metadata?.hasFrontCover || false,
      hasBackCover: metadata?.hasBackCover || false,
      isbn: metadata?.isbn,
      price: metadata?.price,
      publicationDate: metadata?.publicationDate,
    }
  };

  return result;
}

/**
 * Get all available book folders (server-side only, returns empty array on client)
 */
export function getAvailableBooks(config: Partial<BookFileConfig> = {}): string[] {
  // Return empty array on client-side, actual implementation needed on server-side
  if (typeof window !== 'undefined') {
    return [];
  }
  return [];
}

/**
 * Validate book files configuration
 */
export function validateBookFiles(bookFiles: BookFiles): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!bookFiles.main) {
    errors.push('Main PDF file is required');
  }

  if (!bookFiles.frontCover) {
    warnings.push('Front cover PDF is missing');
  }

  if (!bookFiles.backCover) {
    warnings.push('Back cover PDF is missing');
  }

  if (!bookFiles.bookId || bookFiles.bookId.trim() === '') {
    errors.push('Book ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get thumbnail source for a book
 * Priority: front cover > main PDF first page
 */
export function getBookThumbnailSource(bookFiles: BookFiles): {
  pdfUrl: string;
  sourceType: 'front-cover' | 'main-pdf';
} {
  if (bookFiles.frontCover) {
    return {
      pdfUrl: bookFiles.frontCover,
      sourceType: 'front-cover'
    };
  }

  if (bookFiles.main) {
    return {
      pdfUrl: bookFiles.main,
      sourceType: 'main-pdf'
    };
  }

  throw new Error('No PDF source available for thumbnail generation');
}

/**
 * Generate display name from book ID
 */
export function getBookDisplayName(bookId: string): string {
  return bookId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Parse original book folder structure
 */
export function parseOriginalBookFolder(folderName: string): {
  series?: string;
  title?: string;
  part?: string;
  number?: string;
} {
  // Examples to handle:
  // "01_ Neema_01" -> { series: "Neema", part: "01", number: "01" }
  // "04_ Second chance" -> { title: "Second chance", number: "04" }
  // "05_ Angel prayer" -> { title: "Angel prayer", number: "05" }

  const parts = folderName.split(/[_\s]+/).filter(p => p.length > 0);
  const result: any = {};

  if (parts.length >= 1) {
    // First part is usually a number
    const firstPart = parts[0];
    if (/^\d+/.test(firstPart)) {
      result.number = firstPart.replace(/\D/g, '');
    }
  }

  if (parts.length >= 2) {
    const remainingParts = parts.slice(1);
    
    // Check if it follows "Series_PartNumber" pattern
    if (remainingParts.length >= 2 && /^\d+$/.test(remainingParts[remainingParts.length - 1])) {
      result.series = remainingParts.slice(0, -1).join(' ');
      result.part = remainingParts[remainingParts.length - 1];
    } else {
      // Treat as title
      result.title = remainingParts.join(' ');
    }
  }

  return result;
}

/**
 * Get thumbnail source for a book with page preference
 * Priority: front cover > specified page from main PDF > first page of main PDF
 */
export function getBookThumbnailSourceWithPage(bookFiles: BookFiles): {
  pdfUrl: string;
  pageNumber: number;
  sourceType: 'front-cover' | 'main-pdf' | 'main-pdf-page';
} {
  if (bookFiles.frontCover && bookFiles.metadata?.hasFrontCover) {
    return {
      pdfUrl: bookFiles.frontCover,
      pageNumber: 1,
      sourceType: 'front-cover'
    };
  }

  if (bookFiles.main) {
    const pageNumber = bookFiles.thumbnailPage || 1;
    return {
      pdfUrl: bookFiles.main,
      pageNumber,
      sourceType: pageNumber === 1 ? 'main-pdf' : 'main-pdf-page'
    };
  }

  throw new Error('No PDF source available for thumbnail generation');
}

/**
 * Check if a page is within the preview limit
 */
export function isPageWithinPreviewLimit(pageNumber: number, bookFiles: BookFiles): boolean {
  if (!bookFiles.previewPageLimit) {
    return true; // No limit set
  }
  return pageNumber <= bookFiles.previewPageLimit;
}

/**
 * Get preview configuration for a book
 */
export function getBookPreviewConfig(bookFiles: BookFiles): {
  allowedPages: number;
  hasPreviewLimit: boolean;
  isPreviewLimited: boolean;
} {
  const previewLimit = bookFiles.previewPageLimit || 5;
  
  return {
    allowedPages: previewLimit,
    hasPreviewLimit: !!bookFiles.previewPageLimit,
    isPreviewLimited: previewLimit > 0,
  };
}

/**
 * Generate book thumbnail URL based on available files and preferences
 */
export function generateThumbnailUrl(bookFiles: BookFiles): string {
  try {
    const thumbnailSource = getBookThumbnailSourceWithPage(bookFiles);
    
    // In a real implementation, this would generate/serve a thumbnail image
    // For now, we'll return a placeholder or PDF viewer URL
    if (thumbnailSource.sourceType === 'front-cover') {
      return `/api/pdf-thumbnail?url=${encodeURIComponent(thumbnailSource.pdfUrl)}&page=1`;
    }
    
    return `/api/pdf-thumbnail?url=${encodeURIComponent(thumbnailSource.pdfUrl)}&page=${thumbnailSource.pageNumber}`;
  } catch (error) {
    // Fallback to a default thumbnail
    return '/images/book-placeholder.png';
  }
}

/**
 * Validate book file configuration with enhanced checks
 */
export function validateBookFilesEnhanced(bookFiles: BookFiles): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  if (!bookFiles.main) {
    errors.push('Main PDF file is required');
  }

  if (!bookFiles.frontCover && !bookFiles.metadata?.hasFrontCover) {
    warnings.push('Front cover PDF is missing - thumbnail will be generated from main PDF');
    
    if (!bookFiles.thumbnailPage || bookFiles.thumbnailPage === 1) {
      recommendations.push('Consider specifying a different page for thumbnail if page 1 is not suitable');
    }
  }

  if (!bookFiles.backCover && !bookFiles.metadata?.hasBackCover) {
    warnings.push('Back cover PDF is missing');
  }

  if (!bookFiles.bookId || bookFiles.bookId.trim() === '') {
    errors.push('Book ID is required');
  }

  if (bookFiles.thumbnailPage && (bookFiles.thumbnailPage < 1 || bookFiles.thumbnailPage > 50)) {
    errors.push('Thumbnail page must be between 1 and 50');
  }

  if (bookFiles.previewPageLimit && (bookFiles.previewPageLimit < 1 || bookFiles.previewPageLimit > 100)) {
    errors.push('Preview page limit must be between 1 and 100');
  }

  if (!bookFiles.previewPageLimit) {
    recommendations.push('Consider setting a preview page limit to control content access');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}