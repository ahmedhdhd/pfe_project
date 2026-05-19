/**
 * API Types for Multipart Upload Endpoints
 */

// Initiate Upload
export interface InitiateUploadRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
  folder?: string;
}

export interface InitiateUploadResponse {
  success: boolean;
  data: {
    uploadId: string;
    key: string;
    bucket: string;
  };
  message: string;
}

// Get Signed URLs
export interface GetSignedUrlsRequest {
  uploadId: string;
  key: string;
  totalParts: number;
}

export interface SignedUrl {
  partNumber: number;
  uploadUrl: string;
}

export interface GetSignedUrlsResponse {
  success: boolean;
  data: {
    urls: SignedUrl[];
    expiresIn: number;
  };
  message: string;
}

// Complete Upload
export interface UploadPart {
  partNumber: number;
  ETag: string;
}

export interface CompleteUploadRequest {
  uploadId: string;
  key: string;
  parts: UploadPart[];
}

export interface CompleteUploadResponse {
  success: boolean;
  data: {
    key: string;
    publicUrl: string;
    cdnUrl: string;
    bucket: string;
  };
  message: string;
}

// Abort Upload
export interface AbortUploadRequest {
  uploadId: string;
  key: string;
}

export interface AbortUploadResponse {
  success: boolean;
  data: {
    message: string;
  };
  message: string;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
}
