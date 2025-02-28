import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { commonStyles } from '../styles/muiStyles';
import PageContainer from './common/PageContainer';

function Register() {
  const navigate = useNavigate();
  const [usePassword, setUsePassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (usePassword) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // TODO: Handle registration
      console.log('Form data:', formData);
    }
  };

  return (
    <PageContainer>
      <Paper
        component='form'
        onSubmit={handleSubmit}
        sx={{
          ...commonStyles.formContainer,
          maxWidth: '400px',
          margin: '0 auto',
          padding: 3,
        }}
      >
        <Typography variant='h5' component='h1' sx={{ mb: 3 }}>
          Register Account
        </Typography>

        <TextField
          fullWidth
          label='Email'
          name='email'
          type='email'
          value={formData.email}
          onChange={handleChange}
          error={!!errors.email}
          helperText={errors.email}
          sx={{ mb: 2 }}
          required
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
          <>
            <TextField
              fullWidth
              label='Password'
              name='password'
              type='password'
              value={formData.password}
              onChange={handleChange}
              error={!!errors.password}
              helperText={errors.password}
              sx={{ mb: 2 }}
              required
            />

            <TextField
              fullWidth
              label='Confirm Password'
              name='confirmPassword'
              type='password'
              value={formData.confirmPassword}
              onChange={handleChange}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={{ mb: 3 }}
              required
            />
          </>
        )}

        <Box sx={commonStyles.buttonGroup}>
          <Button variant='outlined' onClick={() => navigate('/')}>
            Cancel
          </Button>
          <Button variant='contained' type='submit'>
            Register
          </Button>
        </Box>
      </Paper>
    </PageContainer>
  );
}

export default Register;
