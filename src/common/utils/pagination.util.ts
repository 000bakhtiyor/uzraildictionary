import { PaginatedResponseDto } from '../dto/paginated-response.dto';

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponseDto<T> {
  return new PaginatedResponseDto(data, total, page, limit);
}

export function getSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
