import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authService } from '../../services/authService';

// TODO: Remove mock bypass before production
const MOCK_NUMBER = '1234567890';
const MOCK_OTP = '0000';

export const sendOtp = createAsyncThunk(
  'auth/sendOtp',
  async (mobileNumber: string, { rejectWithValue }) => {
    if (mobileNumber === MOCK_NUMBER) return { message: 'Mock OTP sent' };
    try {
      const response = await authService.sendOtp(mobileNumber);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.response?.data || 'Failed to send OTP');
    }
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ mobileNumber, otp }: { mobileNumber: string, otp: string }, { rejectWithValue }) => {
    if (mobileNumber === MOCK_NUMBER && otp === MOCK_OTP) {
      return { data: { accessToken: 'mock-token-dev', user: { id: 'mock-1', name: 'Admin Dev', role: 'admin' } } };
    }
    try {
      const response = await authService.verifyOtp(mobileNumber, otp);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || error.response?.data || 'Failed to verify OTP');
    }
  }
);

interface User {
  id: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendOtp.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(sendOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Handle various backend response wrapping combinations
        const payloadData = action.payload?.data || action.payload || {};
        const token = payloadData.accessToken || payloadData.token;
        const userData = payloadData.user || payloadData.admin || payloadData.adminData || payloadData.data || payloadData;
        
        if (token && userData) {
          // Construct the user name powerfully gracefully matching possible backend schema variations
          const fallbackName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 
                               userData.username || 
                               'Admin User';

          state.user = {
            id: userData.id || userData._id || '1',
            name: userData.name || userData.fullName || fallbackName,
            role: userData.role || 'admin',
          };
          state.token = token;
          state.isAuthenticated = true;
          localStorage.setItem('token', token);
        } else if (token) {
          // Fallback if no user object exists
          state.token = token;
          state.isAuthenticated = true;
          localStorage.setItem('token', token);
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
