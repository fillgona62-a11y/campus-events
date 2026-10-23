/**
 * 搜索框：输入 + 回车/按钮触发搜索。
 */
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';

export default function SearchBar({ defaultValue = '', placeholder = '搜索活动标题或地点', onSearch }) {
  const [value, setValue] = useState(defaultValue);

  const trigger = () => onSearch && onSearch(value.trim());

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
            <SearchIcon color="action" />
          </InputAdornment>
        ),
        endAdornment: value ? (
          <InputAdornment position="end">
            <IconButton size="small" onClick={trigger} aria-label="搜索">
              <SearchIcon fontSize="small" color="primary" />
            </IconButton>
          </InputAdornment>
        ) : null,
      }}
      sx={{ backgroundColor: '#fff', borderRadius: 2 }}
    />
  );
}
