/**
 * SearchBar.jsx — 搜索框（撞色风格）
 *
 * 视觉要点：
 *   1. 输入框本体沿用 theme.js 的 2px 墨边 + 聚焦撞色光晕（聚焦描边变为绀星紫）
 *   2. 左侧搜索图标放在荧光绿撞色方块里，带墨边与硬投影
 *   3. 输入非空时右侧出现「清除」按钮，一键清空并立即触发搜索
 *   4. 回车即可搜索；所有按钮都有 hover 浮起 + 按压下沉反馈
 *
 * @param {{defaultValue?: string, placeholder?: string, onSearch?: Function}} props
 */
import { useState } from 'react';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { CLASH } from '../theme';

export default function SearchBar({ defaultValue = '', placeholder = '搜索活动标题或地点', onSearch }) {
  const [value, setValue] = useState(defaultValue);

  const trigger = () => onSearch && onSearch(value.trim());

  // 清除输入并立刻把空关键词同步给上层，避免「清空了但列表还是旧的」
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
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-clash-lime shadow-block-ink-sm"
            >
              <SearchIcon sx={{ fontSize: 18, color: CLASH.ink }} />
            </span>
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            <div className="flex items-center gap-1">
              {value && (
                <IconButton
                  size="small"
                  onClick={clear}
                  aria-label="清除搜索内容"
                  sx={{
                    color: CLASH.ink,
                    border: '2px solid var(--ink-line)',
                    borderRadius: '10px',
                    backgroundColor: 'var(--paper-card)',
                    transition: 'transform .16s cubic-bezier(.22,1,.36,1), background-color .16s ease',
                    '&:hover': { backgroundColor: '#F0F0F5', transform: 'translate(-1px, -1px)' },
                    '&:active': { transform: 'translate(1px, 1px) scale(0.94)' },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={trigger}
                aria-label="搜索"
                sx={{
                  color: '#FFFFFF',
                  backgroundColor: CLASH.violet,
                  border: '2px solid var(--ink-line)',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0 0 var(--ink-line)',
                  transition:
                    'transform .16s cubic-bezier(.22,1,.36,1), box-shadow .16s cubic-bezier(.22,1,.36,1)',
                  '&:hover': { backgroundColor: CLASH.violet, boxShadow: '4px 4px 0 0 var(--ink-line)', transform: 'translate(-1px, -1px)' },
                  '&:active': { boxShadow: 'none', transform: 'translate(2px, 2px)' },
                }}
              >
                <SearchIcon fontSize="small" />
              </IconButton>
            </div>
          </InputAdornment>
        ),
      }}
      sx={{
        backgroundColor: 'var(--paper-card)',
        borderRadius: '14px',
        '& .MuiOutlinedInput-root': { minHeight: 48 },
      }}
    />
  );
}
