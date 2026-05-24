import type { Email } from "@prisma/client";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

interface CalendarEmailSettingsButtonProps {
  boardId: string;
}

type Feedback = {
  severity: "success" | "error";
  message: string;
};

type FeedbackState = Feedback | null;

const calendarPanelSx = {
  backgroundColor: "#2d3032",
  color: "#f5f5f5",
};

const feedbackAlertSx = {
  border: "1px solid rgba(255, 255, 255, 0.12)",
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  color: "#f5f5f5",
  "& .MuiAlert-icon": {
    color: "inherit",
  },
};

const statusChipSx = {
  borderColor: "rgba(255, 255, 255, 0.24)",
  color: "#f5f5f5",
  backgroundColor: "rgba(255, 255, 255, 0.06)",
  fontWeight: 700,
};

const getErrorMessage = async (res: Response) => {
  try {
    return await res.text();
  } catch {
    return res.statusText;
  }
};

function CalendarEmailSettingsButton({
  boardId,
}: CalendarEmailSettingsButtonProps) {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addFeedback, setAddFeedback] = useState<FeedbackState>(null);
  const [rowFeedback, setRowFeedback] = useState<Record<string, Feedback>>({});

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: { email: "" },
  });

  const emailsQuery = useQuery({
    queryKey: ["/settings/{id}/emails", boardId],
    queryFn: async () => {
      const resp = await fetch(`/api/settings/${boardId}/emails`);
      if (!resp.ok) {
        return [];
      }
      const emails = await resp.json();
      return emails as Email[];
    },
    enabled: open && !!boardId,
  });

  const invalidateEmails = () =>
    queryClient.invalidateQueries({
      queryKey: ["/settings/{id}/emails", boardId],
    });

  const setEmailFeedback = (email: string, feedback: Feedback) => {
    setRowFeedback((current) => ({ ...current, [email]: feedback }));
  };

  const clearEmailFeedback = (email: string) => {
    setRowFeedback((current) => {
      const next = { ...current };
      delete next[email];
      return next;
    });
  };

  const testConnection = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(
        `/api/settings/${boardId}/emails/${encodeURIComponent(
          email
        )}/connection`,
        { method: "GET" }
      );
      if (!res.ok) {
        throw new Error(await getErrorMessage(res));
      }
      return email;
    },
    onSuccess: (email) => {
      setEmailFeedback(email, {
        severity: "success",
        message: "Connection successful.",
      });
    },
    onError: (error, email) => {
      setEmailFeedback(email, {
        severity: "error",
        message: error instanceof Error ? error.message : "Connection failed.",
      });
    },
    onSettled: invalidateEmails,
  });

  const addEmail = useMutation({
    mutationFn: async (email: string) => {
      const normalizedEmail = email.trim();
      const res = await fetch(`/api/settings/${boardId}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      if (!res.ok) {
        throw new Error(await getErrorMessage(res));
      }
      return normalizedEmail;
    },
    onSuccess: () => {
      reset();
      setAdding(false);
    },
    onError: (error) => {
      setAddFeedback({
        severity: "error",
        message: error instanceof Error ? error.message : "Could not add email.",
      });
    },
    onSettled: invalidateEmails,
  });

  const deleteEmail = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(
        `/api/settings/${boardId}/emails/${encodeURIComponent(email)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        throw new Error(await getErrorMessage(res));
      }
      return email;
    },
    onSuccess: (email) => {
      clearEmailFeedback(email);
    },
    onError: (error, email) => {
      setEmailFeedback(email, {
        severity: "error",
        message: error instanceof Error ? error.message : "Could not delete email.",
      });
    },
    onSettled: invalidateEmails,
  });

  const close = () => {
    setOpen(false);
    setAdding(false);
    setAddFeedback(null);
    setRowFeedback({});
    reset();
  };

  const submitEmail = handleSubmit(({ email }) => {
    if (!email.trim()) {
      return;
    }
    setAddFeedback(null);
    addEmail.mutate(email);
  });

  const content = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxHeight: mobile ? "82vh" : "min(72vh, 640px)",
        overflowY: "auto",
        pb: mobile ? 2 : 0,
      }}
    >
      {addFeedback && (
        <Alert
          severity={addFeedback.severity}
          onClose={() => setAddFeedback(null)}
          sx={{
            ...feedbackAlertSx,
            ...(addFeedback.severity === "error"
              ? {
                  borderColor: "rgba(255, 138, 128, 0.36)",
                  color: "#ffd8d4",
                }
              : {
                  borderColor: "rgba(129, 199, 132, 0.36)",
                  color: "#d8f5d9",
            }),
          }}
        >
          {addFeedback.message}
        </Alert>
      )}

      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => {
          setAddFeedback(null);
          setAdding((value) => !value);
        }}
        sx={{ alignSelf: "flex-start" }}
      >
        Add new
      </Button>

      {adding && (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            submitEmail();
          }}
        >
          <Controller
            control={control}
            name="email"
            render={({ field: { value } }) => (
              <TextField
                label="Gmail calendar email"
                type="email"
                value={value}
                onChange={(event) => setValue("email", event.target.value)}
                disabled={addEmail.isPending}
                fullWidth
              />
            )}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={addEmail.isPending}
            sx={{ minWidth: 112 }}
          >
            {addEmail.isPending ? (
              <CircularProgress color="inherit" size={20} />
            ) : (
              "Submit"
            )}
          </Button>
        </Stack>
      )}

      <Divider />

      {emailsQuery.isPending ? (
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress color="inherit" size={20} />
          <Typography color="text.secondary">Loading calendars...</Typography>
        </Stack>
      ) : emailsQuery.data?.length ? (
        <Stack spacing={1.5}>
          {emailsQuery.data.map((email) => {
            const testing =
              testConnection.isPending &&
              testConnection.variables === email.email;
            const deleting =
              deleteEmail.isPending && deleteEmail.variables === email.email;
            const emailFeedback = rowFeedback[email.email];

            return (
              <Box
                key={email.email}
                sx={{
                  border: "1px solid rgba(255, 255, 255, 0.14)",
                  borderRadius: 1,
                  p: 1.5,
                }}
              >
                <Stack spacing={1.25}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{
                      alignItems: { xs: "flex-start", sm: "center" },
                      justifyContent: "space-between",
                    }}
                  >
                    <Typography sx={{ overflowWrap: "anywhere" }}>
                      {email.email}
                    </Typography>
                    <Chip
                      label={email.connected ? "Connected" : "Not connected"}
                      size="small"
                      variant="outlined"
                      sx={{
                        ...statusChipSx,
                        ...(email.connected
                          ? {
                              borderColor: "rgba(129, 199, 132, 0.5)",
                              color: "#d8f5d9",
                            }
                          : {
                              borderColor: "rgba(255, 213, 128, 0.42)",
                              color: "#ffe6ad",
                            }),
                      }}
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={
                        testing ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : (
                          <RefreshIcon />
                        )
                      }
                      disabled={testing || deleting}
                      onClick={() => {
                        clearEmailFeedback(email.email);
                        testConnection.mutate(email.email);
                      }}
                    >
                      {testing ? "Testing" : "Test connection"}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={
                        deleting ? (
                          <CircularProgress color="inherit" size={16} />
                        ) : (
                          <DeleteIcon />
                        )
                      }
                      disabled={deleting || testing}
                      onClick={() => {
                        clearEmailFeedback(email.email);
                        deleteEmail.mutate(email.email);
                      }}
                      sx={{
                        borderColor: "rgba(255, 138, 128, 0.42)",
                        color: "#ffb4ad",
                        "&:hover": {
                          borderColor: "rgba(255, 138, 128, 0.72)",
                          backgroundColor: "rgba(255, 138, 128, 0.08)",
                        },
                      }}
                    >
                      {deleting ? "Deleting" : "Delete email"}
                    </Button>
                    {emailFeedback?.severity === "success" && (
                      <Tooltip title={emailFeedback.message}>
                        <Box
                          component="span"
                          aria-label={emailFeedback.message}
                          sx={{
                            alignItems: "center",
                            color: "#d8f5d9",
                            display: "inline-flex",
                            minHeight: 30,
                            px: 0.5,
                          }}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </Box>
                      </Tooltip>
                    )}
                  </Stack>
                  {emailFeedback?.severity === "error" && (
                    <Alert
                      severity={emailFeedback.severity}
                      onClose={() => clearEmailFeedback(email.email)}
                      sx={{
                        ...feedbackAlertSx,
                        ...(emailFeedback.severity === "error"
                          ? {
                              borderColor: "rgba(255, 138, 128, 0.36)",
                              color: "#ffd8d4",
                            }
                          : {
                              borderColor: "rgba(129, 199, 132, 0.36)",
                              color: "#d8f5d9",
                            }),
                      }}
                    >
                      {emailFeedback.message}
                    </Alert>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      ) : (
        <Typography color="text.secondary">
          No Gmail calendars have been added yet.
        </Typography>
      )}
    </Box>
  );

  return (
    <>
      <Tooltip title="Calendar email settings">
        <IconButton
          color="inherit"
          aria-label="Calendar email settings"
          onClick={() => setOpen(true)}
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>

      {mobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={close}
          slotProps={{ paper: { sx: calendarPanelSx } }}
        >
          <Box sx={{ p: 2, pt: 1.5 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700 }}>
              Calendar emails
            </Typography>
            {content}
          </Box>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onClose={close}
          fullWidth
          maxWidth="sm"
          slotProps={{ paper: { sx: calendarPanelSx } }}
        >
          <DialogTitle>Calendar emails</DialogTitle>
          <DialogContent>{content}</DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default CalendarEmailSettingsButton;
