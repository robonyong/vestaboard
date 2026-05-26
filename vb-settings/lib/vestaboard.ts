export type VestaboardColor =
  | "RED"
  | "ORANGE"
  | "YELLOW"
  | "GREEN"
  | "BLUE"
  | "PURPLE"
  | "WHITE";

export const VESTABOARD_COLORS = [
  "RED",
  "ORANGE",
  "YELLOW",
  "GREEN",
  "BLUE",
  "PURPLE",
  "WHITE",
] satisfies VestaboardColor[];

export const isVestaboardColor = (color: unknown): color is VestaboardColor => {
  return (
    typeof color === "string" &&
    VESTABOARD_COLORS.some((vestaboardColor) => vestaboardColor === color)
  );
};
