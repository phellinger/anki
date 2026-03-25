import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageContainer from './common/PageContainer';
import axios from '../services/api';
import { useUser } from '../contexts/UserContext';
import { commonStyles } from '../styles/muiStyles';

const STEP_ENTER = 1;
const STEP_CODE = 2;

function SignIn() {
  const navigate = useNavigate();
  const { refreshUser } = useUser();
  const [step, setStep] = useState(STEP_ENTER);
  const [usePassword, setUsePassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState(
    /** @type {Record<string, string>} */ ({})
  );
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

  const applySessionAndGoHome = async () => {
    await refreshUser();
    navigate('/');
  };

  const handlePasswordSignIn = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!identifier.trim()) {
      setErrors({ identifier: 'Enter your email or username' });
      return;
    }
    if (!password) {
      setErrors({ password: 'Password required' });
      return;
    }
    setLoading(true);
    try {
      await axios.post('/auth/login/password', {
        identifier: identifier.trim(),
        password,
      });
      await applySessionAndGoHome();
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || 'Sign-in failed'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!identifier.trim()) {
      setErrors({ identifier: 'Enter your email or username' });
      return;
    }
    setLoading(true);
    try {
      await axios.post('/auth/login/otp/request', {
        identifier: identifier.trim(),
      });
      setStep(STEP_CODE);
      setErrors({});
    } catch (err) {
      setSubmitError(
        err.response?.data?.error || 'Could not send sign-in code'
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
      await axios.post('/auth/login/otp/verify', {
        identifier: identifier.trim(),
        code: code.trim(),
      });
      await applySessionAndGoHome();
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Paper
        component='form'
        onSubmit={
          usePassword
            ? handlePasswordSignIn
            : step === STEP_ENTER
              ? handleSendCode
              : handleVerifyCode
        }
        sx={{
          ...commonStyles.formContainer,
          maxWidth: '400px',
          margin: '0 auto',
          padding: 3,
        }}
      >
        <Typography variant='h5' component='h1' sx={{ mb: 1 }}>
          Sign in
        </Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          {step === STEP_CODE
            ? 'Enter the code we sent to your email.'
            : 'Use the email or username you registered with.'}
        </Typography>

        {submitError && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        {step === STEP_ENTER && (
          <>
            <TextField
              fullWidth
              label='Email or username'
              name='identifier'
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) {
                  setErrors((prev) => ({ ...prev, identifier: '' }));
                }
              }}
              error={!!errors.identifier}
              helperText={errors.identifier}
              sx={{ mb: 2 }}
              autoComplete='username'
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
            {usePassword && (
              <TextField
                fullWidth
                label='Password'
                name='password'
                type='password'
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                error={!!errors.password}
                helperText={errors.password}
                sx={{ mb: 2 }}
                autoComplete='current-password'
              />
            )}
          </>
        )}

        {step === STEP_CODE && (
          <TextField
            fullWidth
            label='4-digit code'
            name='code'
            inputProps={{
              inputMode: 'numeric',
              maxLength: 4,
            }}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
              if (errors.code) {
                setErrors((prev) => ({ ...prev, code: '' }));
              }
            }}
            error={!!errors.code}
            helperText={errors.code}
            sx={{ mb: 2 }}
            autoFocus
          />
        )}

        <Box sx={commonStyles.buttonGroup}>
          <Button
            variant='outlined'
            onClick={() =>
              step === STEP_CODE
                ? setStep(STEP_ENTER)
                : navigate('/')
            }
            disabled={loading}
          >
            {step === STEP_CODE ? 'Back' : 'Cancel'}
          </Button>
          <Button variant='contained' type='submit' disabled={loading}>
            {usePassword && step === STEP_ENTER && 'Sign in'}
            {!usePassword && step === STEP_ENTER && 'Send code'}
            {step === STEP_CODE && 'Verify'}
          </Button>
        </Box>

        <Typography variant='body2' sx={{ mt: 2 }}>
          No account?{' '}
          <Button size='small' onClick={() => navigate('/register')}>
            Register
          </Button>
        </Typography>
      </Paper>
    </PageContainer>
  );
}

export default SignIn;
