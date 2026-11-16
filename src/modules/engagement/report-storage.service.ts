import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";

const DEFAULT_UPLOAD_DIR = resolve(process.cwd(), "storage", "client-reports");
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
]);

@Injectable()
export class ReportStorageService implements OnModuleInit {
  private readonly rootDir =
    process.env.REPORTS_UPLOAD_DIR?.trim() || DEFAULT_UPLOAD_DIR;

  async onModuleInit(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
  }

  async saveClientReport(input: {
    clientId: string;
    originalName: string;
    buffer: Buffer;
    mimeType?: string;
  }): Promise<{
    fileKey: string;
    originalFileName: string;
    contentType: string;
  }> {
    if (!input.buffer?.length) {
      throw new BadRequestException("Report file is required");
    }
    if (input.buffer.length > MAX_FILE_BYTES) {
      throw new BadRequestException("Report file exceeds the 15MB limit");
    }

    const originalFileName = this.sanitizeFileName(input.originalName);
    const extension = extname(originalFileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException(
        `Unsupported file type. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}`,
      );
    }

    const relativeKey = join(
      "clients",
      input.clientId,
      `${randomUUID()}${extension}`,
    ).replace(/\\/g, "/");
    const absolutePath = this.resolveSafePath(relativeKey);
    await mkdir(join(absolutePath, ".."), { recursive: true });
    await writeFile(absolutePath, input.buffer);

    return {
      fileKey: relativeKey,
      originalFileName,
      contentType:
        input.mimeType?.trim() || this.contentTypeForExtension(extension),
    };
  }

  openReadStream(fileKey: string): { stream: Readable; absolutePath: string } {
    const absolutePath = this.resolveSafePath(fileKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException("Report file not found in storage");
    }
    return {
      stream: createReadStream(absolutePath),
      absolutePath,
    };
  }

  async deleteIfExists(fileKey: string | null | undefined): Promise<void> {
    if (!fileKey) return;
    try {
      const absolutePath = this.resolveSafePath(fileKey);
      if (existsSync(absolutePath)) {
        await unlink(absolutePath);
      }
    } catch {
      // Best-effort cleanup; metadata delete still proceeds.
    }
  }

  private resolveSafePath(fileKey: string): string {
    const normalized = fileKey.replace(/\\/g, "/");
    if (
      !normalized ||
      normalized.includes("..") ||
      normalized.startsWith("/") ||
      normalized.includes("\0")
    ) {
      throw new BadRequestException("Invalid report file key");
    }
    const absolutePath = resolve(this.rootDir, normalized);
    const rootWithSep = this.rootDir.endsWith(sep)
      ? this.rootDir
      : `${this.rootDir}${sep}`;
    if (
      absolutePath !== this.rootDir &&
      !absolutePath.startsWith(rootWithSep)
    ) {
      throw new BadRequestException("Invalid report file key");
    }
    return absolutePath;
  }

  private sanitizeFileName(name: string): string {
    const base = basename(name || "report").replace(/[^\w.\- ()]/g, "_");
    const trimmed = base.trim() || "report";
    return trimmed.slice(0, 180);
  }

  private contentTypeForExtension(extension: string): string {
    switch (extension) {
      case ".pdf":
        return "application/pdf";
      case ".doc":
        return "application/msword";
      case ".docx":
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".xls":
        return "application/vnd.ms-excel";
      case ".xlsx":
        return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".ppt":
        return "application/vnd.ms-powerpoint";
      case ".pptx":
        return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      case ".csv":
        return "text/csv";
      case ".txt":
        return "text/plain";
      default:
        return "application/octet-stream";
    }
  }
}
