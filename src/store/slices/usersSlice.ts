import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService, type UserFilters } from '../../services/userService';

// Matches the backend `select` fields from getUsersList
export interface ApiUser {
  id: string;
  name: string | null;
  mobileNumber: string;
  gender: string | null;
  role: string;
  status: string;
  city: string | null;
  area: string | null;
  pincode: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  _count?: { listings: number; reviews: number };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface UsersState {
  users: ApiUser[];
  meta: PaginationMeta;
  isLoading: boolean;
  error: string | null;
}

const initialState: UsersState = {
  users: [],
  meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
  isLoading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (filters: UserFilters, { rejectWithValue }) => {
    try {
      return await userService.getUsers(filters);
    } catch (error: any) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch users'
      );
    }
  }
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        const payload = action.payload;

        // Users array — backend uses 'items'
        state.users = Array.isArray(payload?.items) ? payload.items : [];

        // Pagination meta — handle both nested { meta: {...} } and flat root fields
        const nested = payload?.meta;
        state.meta = {
          total:      nested?.total      ?? payload?.total      ?? state.users.length,
          page:       nested?.page       ?? payload?.page       ?? 1,
          limit:      nested?.limit      ?? payload?.limit      ?? 10,
          totalPages: nested?.totalPages ?? payload?.totalPages ?? payload?.lastPage ?? 1,
        };
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export default usersSlice.reducer;
