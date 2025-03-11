import React, { useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton, 
  Typography,
  Divider,
  Button
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  OpenInNew as OpenIcon
} from '@mui/icons-material';
import { THEME_COLORS } from '../../shared/theme';
import { useAppContext } from '../context/AppContext';

const RecentTranscriptions: React.FC = () => {
  const { recentFiles, refreshRecentFiles } = useAppContext();
  
  useEffect(() => {
    refreshRecentFiles();
  }, []);
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString();
  };
  
  const openFile = (path: string): void => {
    // This will be handled by the main process
    window.electronAPI.openFile(path);
  };
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2" color="textSecondary">
          {recentFiles.length} recent transcriptions
        </Typography>
        
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={refreshRecentFiles}
        >
          Refresh
        </Button>
      </Box>
      
      {recentFiles.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: 100,
          }}
        >
          <Typography variant="body2" color="textSecondary" align="center">
            No recent transcriptions found.
          </Typography>
        </Box>
      ) : (
        <List
          sx={{
            width: '100%',
            bgcolor: THEME_COLORS.background,
            border: `1px solid ${THEME_COLORS.divider}`,
            borderRadius: 1,
            overflow: 'auto',
            maxHeight: 300,
          }}
        >
          {recentFiles.map((file, index) => (
            <React.Fragment key={file.path}>
              <ListItem button onClick={() => openFile(file.path)}>
                <ListItemText
                  primary={file.name}
                  secondary={`${formatDate(file.modifiedAt)} • ${formatFileSize(file.size)}`}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" aria-label="open" onClick={() => openFile(file.path)}>
                    <OpenIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
              {index < recentFiles.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

export default RecentTranscriptions; 