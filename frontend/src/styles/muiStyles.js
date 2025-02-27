import { alpha } from '@mui/material';

export const commonStyles = {
  // Layout containers
  pageBox: {
    padding: { xs: '0.5rem', sm: '1rem' },
    maxWidth: '100%',
    boxSizing: 'border-box',
  },

  contentPaper: {
    bgcolor: 'background.paper',
    color: 'text.primary',
    p: { xs: 2, sm: 3 },
    borderRadius: 2,
    width: '100%',
    mt: { xs: 3, sm: 3 },
  },

  // Headers and titles
  pageTitle: {
    textAlign: 'center',
    mb: 3,
    mt: 2,
    fontSize: { xs: '1.25rem', sm: '1.5rem' },
    fontWeight: 'bold',
  },

  welcomeTitle: {
    textAlign: 'center',
    mb: 3,
    mt: 2,
  },

  sectionTitle: {
    margin: 0,
    paddingTop: '4px',
    mb: { xs: 1, sm: 0 },
    fontWeight: 'bold',
    fontSize: { xs: '1.5rem', sm: '2rem' },
  },

  // Lists and items
  listContainer: {
    width: '100%',
    padding: 0,
    mt: 2,
    '& .MuiListItem-root': {
      borderBottom: 'none',
      py: { xs: 1, sm: 1.5 },
      px: 0,
    },
  },

  listItem: {
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'stretch', sm: 'center' },
    gap: { xs: 1, sm: 2 },
    borderBottom: 'none',
    pr: { sm: 1 },
  },

  // Common components
  userInfo: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },

  // Form elements
  formField: {
    mb: 2,
    width: '100%',
    '& .MuiOutlinedInput-root': {
      bgcolor: 'background.default',
    },
  },

  textarea: {
    width: '100%',
    mb: 2,
    minHeight: 200,
    p: 1,
    boxSizing: 'border-box',
    bgcolor: 'background.default',
    color: 'text.primary',
  },

  // Button groups
  buttonGroup: {
    display: 'flex',
    gap: 1,
    justifyContent: 'flex-end',
    flexDirection: { xs: 'column', sm: 'row' },
    width: { xs: '100%', sm: 'auto' },
  },

  actionButtons: {
    display: 'flex',
    gap: 0.5,
    justifyContent: { xs: 'center', sm: 'flex-end' },
    width: { xs: '100%', sm: 'auto' },
  },

  // Cards
  card: {
    p: { xs: 2, sm: 3 },
    width: '100%',
    maxWidth: { xs: '100%', sm: '400px' },
    minHeight: { xs: 150, sm: 200 },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },

  statisticsCard: {
    width: '100%',
    maxWidth: 600,
    p: { xs: 2, sm: 3 },
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    minHeight: { xs: 250, sm: 300 },
  },
};
