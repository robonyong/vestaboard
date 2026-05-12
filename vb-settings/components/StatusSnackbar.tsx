import CloseIcon from "@mui/icons-material/Close";
import { Alert, IconButton, Snackbar } from "@mui/material";

interface StatusSnackbarProps {
  errorMessage?: string;
  onClose: () => void;
  open: boolean;
  successMessage: string;
}

function StatusSnackbar({
  errorMessage,
  onClose,
  open,
  successMessage,
}: StatusSnackbarProps) {
  return (
    <Snackbar
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
    >
      <Alert
        severity={errorMessage ? "error" : "success"}
        sx={{
          "& .MuiAlert-action": {
            alignItems: "center",
            paddingTop: 0,
          },
        }}
        action={
          <IconButton
            aria-label="Close"
            color="inherit"
            size="small"
            onClick={onClose}
          >
            <CloseIcon fontSize="inherit" />
          </IconButton>
        }
        variant="filled"
      >
        {errorMessage ?? successMessage}
      </Alert>
    </Snackbar>
  );
}

export default StatusSnackbar;
