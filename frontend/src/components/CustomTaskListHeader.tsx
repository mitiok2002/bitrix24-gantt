import type { FC } from "react";

interface CustomTaskListHeaderProps {
  headerHeight: number;
  rowWidth: string;
  fontFamily: string;
  fontSize: string;
}

export const CustomTaskListHeader: FC<CustomTaskListHeaderProps> = ({
  headerHeight,
  rowWidth,
  fontFamily,
  fontSize,
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${rowWidth} ${rowWidth} ${rowWidth}`,
        borderBottom: "1px solid #e0e0e0",
        borderLeft: "1px solid #e0e0e0",
        borderRight: "1px solid #e0e0e0",
        fontFamily,
        fontSize,
        fontWeight: 600,
        background: "#f5f7fb",
        color: "#1f2933",
        height: headerHeight,
        alignItems: "center",
      }}
    >
      <div style={{ paddingLeft: 16 }}>Проект / Задача</div>
      <div style={{ borderLeft: "1px solid #e0e0e0", paddingLeft: 16 }}>
        Начало
      </div>
      <div style={{ borderLeft: "1px solid #e0e0e0", paddingLeft: 16 }}>
        Окончание
      </div>
    </div>
  );
};
