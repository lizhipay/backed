import Box from '@mui/material/Box';

interface BrandLogoProps {
  size?: number;
  /** Outline (wireframe) style for the login card, per the reference. */
  variant?: 'solid' | 'outline';
}

/**
 * The original "Backed Admin" mark — an abstract B. No copied branding. Solid
 * variant for the sidebar; outline (wireframe circle) for the login card.
 */
export function BrandLogo({ size = 32, variant = 'solid' }: BrandLogoProps) {
  if (variant === 'outline') {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1.5px solid',
          borderColor: 'text.primary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.primary',
          fontWeight: 700,
          fontSize: size * 0.5,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        B
      </Box>
    );
  }
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        bgcolor: 'primary.main',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.55,
        fontFamily: 'Inter, sans-serif',
      }}
    >
      B
    </Box>
  );
}
