import MoreVertIcon from "@mui/icons-material/MoreVert";
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, type SvgIconProps } from "@mui/material";
import { useState, type ReactNode } from "react";
import { useBackButtonClose } from "../hooks/useBackButtonClose";

export type ActionMenuItem = {
  label: string;
  onClick: () => void;
  color?: "default" | "error" | "warning";
  icon?: ReactNode;
};

function itemColor(color: ActionMenuItem["color"]) {
  if (color === "error") return "error.main";
  if (color === "warning") return "warning.main";
  return undefined;
}

export function ActionMenu({
  ariaLabel,
  items,
  iconProps,
}: {
  ariaLabel: string;
  items: ActionMenuItem[];
  iconProps?: SvgIconProps;
}) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const closeMenu = () => setAnchorEl(null);
  const menuBackButtonClose = useBackButtonClose(Boolean(anchorEl), closeMenu);

  function runItem(item: ActionMenuItem) {
    menuBackButtonClose.closeWithoutHistoryBack();
    item.onClick();
  }

  return (
    <>
      <IconButton aria-label={ariaLabel} onClick={(event) => setAnchorEl(event.currentTarget)}>
        <MoreVertIcon {...iconProps} />
      </IconButton>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
        {items.map((item) => {
          const color = itemColor(item.color);
          return (
            <MenuItem key={item.label} onClick={() => runItem(item)} sx={{ color }}>
              {item.icon && <ListItemIcon sx={{ color }}>{item.icon}</ListItemIcon>}
              <ListItemText>{item.label}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
