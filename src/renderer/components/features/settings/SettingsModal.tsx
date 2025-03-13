import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import SettingsPanel from './SettingsPanel';
import { rendererLogger } from '../../../../shared/preload-logger';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    try {
      rendererLogger.info('Settings saved and modal closed');
      onOpenChange(false);
    } catch (error) {
      rendererLogger.exception(error as Error, 'Error handling settings save');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <SettingsPanel onSave={handleSave} />
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal; 