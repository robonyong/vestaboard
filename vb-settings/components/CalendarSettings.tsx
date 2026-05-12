import type { Email } from "@prisma/client";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import styles from "../styles/Calendar.module.css";

interface CalendarSettingsProps {
  boardId: string;
  emails: Email[];
}

function CalendarSettings({ boardId, emails }: CalendarSettingsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: { email: "" },
  });

  const onCloseModal = useCallback(() => {
    setAddModalOpen(false);
    reset();
  }, [reset]);

  const onCloseDeleteModal = useCallback(() => {
    setDeletingEmail(null);
  }, []);

  const emailConnectionMutator = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(
        `/api/settings/${boardId}/emails/${email}/connection`,
        { method: "GET" }
      );
      if (!res.ok) {
        let error = res.statusText;
        try {
          error = await res.text();
        } catch (err) {
          console.error("unable to process error message from server");
        }
        throw new Error(error);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["/settings/{id}/emails", boardId],
      });
    },
  });

  const emailMutator = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(`/api/settings/${boardId}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, boardId, connected: false }),
      });
      if (!res.ok) {
        let error = res.statusText;
        try {
          error = await res.text();
        } catch (err) {
          console.error("unable to process error message from server");
        }
        throw new Error(error);
      }
      emailConnectionMutator.mutate(email);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/settings/{id}/emails", boardId],
      });
      onCloseModal();
    },
  });

  const emailDeleter = useMutation({
    mutationFn: async (email: string | null) => {
      if (!email) {
        return;
      }
      const res = await fetch(`/api/settings/${boardId}/emails/${email}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        let error = res.statusText;
        try {
          error = await res.text();
        } catch (err) {
          console.error("unable to process error message from server");
        }
        throw new Error(error);
      }
    },
    onSuccess: () => {
      onCloseDeleteModal();
      queryClient.invalidateQueries({
        queryKey: ["/settings/{id}/emails", boardId],
      });
    },
  });

  const onSubmit = handleSubmit(({ email }) => {
    emailMutator.mutate(email);
  });

  const onReconnect = (email: string) => emailConnectionMutator.mutate(email);

  return (
    <Box className={styles.appShell}>
      <Container maxWidth="sm">
        <Snackbar
          open={!emailMutator.isIdle && !emailMutator.isPending}
          autoHideDuration={4000}
          onClose={() => emailMutator.reset()}
        >
          <Alert
            severity={emailMutator.isSuccess ? "success" : "error"}
            onClose={() => emailMutator.reset()}
            variant="filled"
          >
            {emailMutator.isSuccess
              ? "Saved!"
              : `Failed to save: ${emailMutator.error?.message}`}
          </Alert>
        </Snackbar>

        <main className={styles.main}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton
              color="inherit"
              aria-label="Back"
              onClick={() => router.push(`/${boardId}`)}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" component="h1" fontWeight={700}>
              Calendars
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            onClick={() => setAddModalOpen(true)}
            sx={{ alignSelf: "flex-start", minWidth: 200 }}
          >
            Add Calendar
          </Button>

          <Dialog
            fullScreen={false}
            open={addModalOpen}
            onClose={onCloseModal}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>Add new calendar</DialogTitle>
            <DialogContent>
              <Controller
                control={control}
                name="email"
                render={({ field: { value } }) => (
                  <TextField
                    label="Google Calendar Email"
                    value={value}
                    onChange={(event) => setValue("email", event.target.value)}
                    margin="dense"
                    fullWidth
                  />
                )}
              />
              <Typography variant="body2" color="text.secondary">
                Remember to share your calendar with the installable&apos;s
                service account
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={onCloseModal}>
                Cancel
              </Button>
              <Button variant="contained" onClick={onSubmit}>
                Save
              </Button>
            </DialogActions>
          </Dialog>

          <Dialog
            open={!!deletingEmail}
            onClose={onCloseDeleteModal}
            fullWidth
            maxWidth="xs"
          >
            <DialogTitle>Delete calendar?</DialogTitle>
            <DialogContent>
              <Typography>
                Are you sure you want to delete the calendar associated with{" "}
                {deletingEmail}?
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button variant="outlined" onClick={onCloseDeleteModal}>
                Cancel
              </Button>
              <Button
                color="error"
                variant="contained"
                onClick={() => emailDeleter.mutate(deletingEmail)}
              >
                Delete
              </Button>
            </DialogActions>
          </Dialog>

          {emails.length > 0 && (
            <section className={styles.emailContainer}>
              <Typography variant="h6" component="h2">
                Added Calendars
              </Typography>
              {emails.map((email) => (
                <div className={styles.emailRow} key={email.email}>
                  <div className={styles.email}>
                    {email.email}
                    <span
                      className={
                        email.connected
                          ? styles.statusConnected
                          : styles.statusDisconnected
                      }
                    >
                      &#8226;
                    </span>
                  </div>
                  <div className={styles.icons}>
                    <Button
                      variant="text"
                      onClick={() => onReconnect(email.email)}
                    >
                      {emailConnectionMutator.isPending &&
                      emailConnectionMutator.variables === email.email
                        ? "Connecting..."
                        : "Retest"}
                    </Button>
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => setDeletingEmail(email.email)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </section>
          )}
        </main>
      </Container>
    </Box>
  );
}

export default CalendarSettings;
