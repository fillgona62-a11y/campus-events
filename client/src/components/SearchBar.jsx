/**
 * SearchBar.jsx — 搜索框（清爽风格）
 *
 * 视觉：细描边输入框 + 简洁搜索按钮，无硬边/硬投影。
 */
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';

export default function SearchBar({ defaultValue = '', placeholder = '搜索活动标题或地点', onSearch }) {
  const [value, setValue] = useState(defaultValue);

  const trigger = () => onSearch && onSearch(value.trim());

  const clear = () => {
    setValue('');
    onSearch && onSearch('');
  };

  return (
    <TextField
      fullWidth
      size="small"
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') trigger();
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ fontSize: 18, color: 'var(--ink-mute)' }} />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {value && (
              <IconButton size="small" onClick={clear} aria-label="清除搜索内容" sx={{ color: 'var(--ink-mute)' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={trigger}
              aria-label="搜索"
              sx={{
                color: '#fff',
                backgroundColor: '#9c6b3f',
                borderRadius: '8px',
                '&:hover': { backgroundColor: '#7a5230' },
              }}
            >
              <SearchIcon fontSize="small" />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{
        backgroundColor: 'var(--paper-card)',
        borderRadius: '10px',
        '& .MuiOutlinedInput-root': { minHeight: 44 },
      }}
    />
  );
}
