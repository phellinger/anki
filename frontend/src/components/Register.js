import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Typography,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { commonStyles } from '../styles/muiStyles';
import PageContainer from './common/PageContainer';
import axios from '../services/api';
import { useUser } from '../contexts/UserContext';

const steps = { EMAIL: 1, CODE: 2, PROFILE: 3 };

function Register() {
  const navigate = useNavigate();
  const { user, refreshUser } = useUser();
  const [step, setStep] = useState(steps.EMAIL);
  const [usePassword, setUsePassword] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (step === steps.PROFILE && user?.username) {
      setUsername(user.username);
    }
  }, [step, user?.username]);

  const clearFieldError = (name) => {
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Invalid email address' });
      return;
    }
    setLoading(true);
    try {
      await axios.post('/auth/register/otp/request', { email: email.trim() });
      setStep(steps.CODE);
      setErrors({});
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || 'Could not send verification email'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!/^\d{4}$/.test(code.trim())) {
      setErrors({ code: 'Enter the 4-digit code' });
      return;
    }
    setLoading(true);
    try {
      await axios.post('/auth/register/otp/verify', {
        email: email.trim(),
        code: code.trim(),
      });
      setStep(steps.PROFILE);
      setErrors({});
      if (user?.username) {
        setUsername(user.username);
      }
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const newErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Choose a username';
    }
    if (usePassword) {
      if (!password) {
        newErrors.password = 'Password is required';
      } else if (password.length < 8) {
        newErrors.password = 'At least 8 characters';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setLoading(true);
    try {
      await axios.post('/auth/register/complete', {
        username: username.trim(),
        password: usePassword ? password : undefined,
      });
      await refreshUser();
      navigate('/');
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || 'Could not complete registration'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Paper
        component='form'
        onSubmit={
          step === steps.EMAIL
            ? handleSendCode
            : step === steps.CODE
              ? handleVerifyCode
              : handleComplete
        }
        sx={{
          ...commonStyles.formContainer,
          maxWidth: '400px',
          margin: '0 auto',
          padding: 3,
        }}
      >
        <Typography variant='h5' component='h1' sx={{ mb: 2 }}>
          Register Account
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          {step === steps.EMAIL && 'Enter your email — we will send a 4-digit code.'}
          {step === steps.CODE && 'Check your inbox and enter the code.'}
          {step === steps.PROFILE &&
            'Choose your display name and optional password.'}
        </Typography>

        {submitError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {step === steps.EMAIL && (
          <>
            <TextField
              fullWidth
              label='Email'
              name='email'
              type='email'
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                clearFieldError('email');
              }}
              error={!!errors.email}
              helperText={errors.email}
              sx={{ mb: 2 }}
              autoComplete='email'
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={usePassword}
                  onChange={(e) => setUsePassword(e.target.checked)}
                />
              }
              label='Use password'
              sx={{ mb: 2 }}
            />
          </>
        )}

        {step === steps.CODE && (
          <TextField
            fullWidth
            label='4-digit code'
            name='code'
            inputProps={{
              inputMode: 'numeric',
              maxLength: 4,
              pattern: '[0-9]*',
            }}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
              clearFieldError('code');
            }}
            error={!!errors.code}
            helperText={errors.code}
            sx={{ mb: 2 }}
            autoFocus
          />
        )}

        {step === steps.PROFILE && (
          <>
            <TextField
              fullWidth
              label='Username'
              name='username'
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                clearFieldError('username');
              }}
              error={!!errors.username}
              helperText={errors.username || 'Shown when you study'}
              sx={{ mb: 2 }}
              autoComplete='username'
            />
            {usePassword && (
              <>
                <TextField
                  fullWidth
                  label='Password'
                  name='password'
                  type='password'
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError('password');
                  }}
                  error={!!errors.password}
                  helperText={errors.password}
                  sx={{ mb: 2 }}
                  autoComplete='new-password'
                />
                <TextField
                  fullWidth
                  label='Confirm Password'
                  name='confirmPassword'
                  type='password'
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError('confirmPassword');
                  }}
                  error={!!errors.confirmPassword}
                  helperText={errors.confirmPassword}
                  sx={{ mb: 2 }}
                  autoComplete='new-password'
                />
              </>
            )}
          </>
        )}

        <Box sx={commonStyles.buttonGroup}>
          <Button
            variant='outlined'
            onClick={() =>
              step === steps.EMAIL ? navigate('/') : setStep(step - 1)
            }
            disabled={loading}
          >
            {step === steps.EMAIL ? 'Cancel' : 'Back'}
          </Button>
          <Button variant='contained' type='submit' disabled={loading}>
            {step === steps.EMAIL && 'Send code'}
            {step === steps.CODE && 'Verify'}
            {step === steps.PROFILE && 'Finish'}
          </Button>
        </Box>
      </Paper>
    </PageContainer>
  );
}

export default Register;
