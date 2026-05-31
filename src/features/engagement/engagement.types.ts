export type InquiryDto = Readonly<{
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  message?: string;
  serviceId?: string;
  packageId?: string;
  targetName?: string;
  targetType?: string;
  targetReferenceId?: string;
  sortOrder?: number;
}>;

export type ReplyDto = Readonly<{
  message: string;
  inquiryId?: string;
  contactId?: string;
  siteInquiryId?: string;
  repliedById?: string;
  sortOrder?: number;
}>;

export type ContactDto = Readonly<{
  fullname: string;
  email: string;
  organization?: string;
  phoneNo: string;
  address: string;
  message: string;
  purpose: string;
  sortOrder?: number;
}>;

export type SiteInquiryDto = Readonly<{
  fullName?: string;
  email?: string;
  phone?: string;
  inquiryType?: string;
  details?: string;
  idempotencyKey?: string;
  sourcePage?: string;
  isView?: boolean;
  isHandled?: boolean;
  adminNote?: string;
  sortOrder?: number;
}>;

export type ReviewDto = Readonly<{
  reviewerName: string;
  reviewerEmail: string;
  title?: string;
  comment: string;
  rating: number;
  isSite?: boolean;
  productId?: string;
  isPublished?: boolean;
  removeUrls?: ReadonlyArray<string>;
  sortOrder?: number;
}>;

export type FaqDto = Readonly<{
  title: string;
  description?: string | Readonly<Record<string, unknown>>;
  isSite?: boolean;
  productId?: string;
  isActive?: boolean;
  sortOrder?: number;
}>;
