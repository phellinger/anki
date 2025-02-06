import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import EastIcon from '@mui/icons-material/East';
import WestIcon from '@mui/icons-material/West';

const DirectionToggle = ({ direction, onDirectionChange }) => {
  const getIcon = () => {
    switch (direction) {
      case 'both':
        return <CompareArrowsIcon />;
      case 'leftToRight':
        return <EastIcon />;
      case 'rightToLeft':
        return <WestIcon />;
      default:
        return <CompareArrowsIcon />;
    }
  };

  const getTooltip = () => {
    switch (direction) {
      case 'both':
        return 'Random direction (click to show left side only)';
      case 'leftToRight':
        return 'Show left side first (click to show right side only)';
      case 'rightToLeft':
        return 'Show right side first (click to return to random)';
      default:
        return 'Random direction';
    }
  };

  const handleClick = () => {
    switch (direction) {
      case 'both':
        onDirectionChange('leftToRight');
        break;
      case 'leftToRight':
        onDirectionChange('rightToLeft');
        break;
      case 'rightToLeft':
        onDirectionChange('both');
        break;
      default:
        onDirectionChange('both');
    }
  };

  return (
    <Tooltip title={getTooltip()}>
      <IconButton onClick={handleClick} color='primary'>
        {getIcon()}
      </IconButton>
    </Tooltip>
  );
};

export default DirectionToggle;
