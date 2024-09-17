import { Email } from "@prisma/client";

import {
  App,
  BackButton,
  Body,
  Button,
  colors,
  Container,
  Input,
  ModalDialog,
  Progress,
  Small,
  Spacer,
  SubTitle,
  SubTitle2,
  Title,
  Toast,
} from "@vestaboard/installables";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  }, []);

  const onCloseDeleteModal = useCallback(() => {
    setDeletingEmail(null);
  }, []);

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

  const emailConnectionMutator = useMutation({
    mutationFn: async (email: string) => {
      const res = await fetch(
        `/api/settings/${boardId}/emails/${email}/connection`,
        {
          method: "GET",
        }
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
    <App color={colors.shark}>
      <Container>
        <Toast
          severity={emailMutator.isSuccess ? "success" : "error"}
          message={
            emailMutator.isSuccess
              ? "Saved!"
              : `Failed to save: ${emailMutator.error?.message}`
          }
          open={!emailMutator.isIdle && !emailMutator.isPending}
          onClose={() => emailMutator.reset()}
        />
        <div className={styles.main}>
          <Title>
            <BackButton onClick={() => router.push(`/${boardId}`)} />
            Calendars
          </Title>
          <Spacer size="large" />
          <SubTitle2>
            <Button
              width={200}
              buttonType="outline"
              onClick={() => setAddModalOpen(true)}
            >
              Add Calendar
            </Button>
          </SubTitle2>
          <ModalDialog
            fullScreenMobile
            visible={addModalOpen}
            onClose={onCloseModal}
            header={<SubTitle>Add new calendar</SubTitle>}
            footer={
              <>
                <Button buttonType="outline" onClick={onCloseModal}>
                  Cancel
                </Button>
                <Button onClick={onSubmit}>Save</Button>
              </>
            }
          >
            <div>
              <Controller
                control={control}
                render={({ field: { value } }) => (
                  <Input
                    label="Google Calendar Email"
                    value={value}
                    onValueChange={(newValue) => setValue("email", newValue)}
                  />
                )}
                name="email"
              />
              <Small>
                Remember to share your calendar with the installable&apos;s
                service account
              </Small>
            </div>
          </ModalDialog>
          <ModalDialog
            fullScreenMobile
            visible={!!deletingEmail}
            onClose={onCloseDeleteModal}
            header={<SubTitle>Delete calendar?</SubTitle>}
            footer={
              <>
                <Button buttonType="outline" onClick={onCloseDeleteModal}>
                  Cancel
                </Button>
                <Button
                  buttonType="danger"
                  onClick={() => emailDeleter.mutate(deletingEmail)}
                >
                  Delete
                </Button>
              </>
            }
          >
            <Body>
              Are you sure you want to delete the calendar associated with{" "}
              {deletingEmail}?
            </Body>
          </ModalDialog>
          {emails.length > 0 && (
            <div className={styles.emailContainer}>
              <SubTitle2>Added Calendars</SubTitle2>
              {emails.map((email) => {
                return (
                  <div className={styles.emailRow} key={email.email}>
                    <div className={styles.email}>
                      {email.email}
                      <span
                        style={{
                          color: email.connected ? colors.green : colors.orange,
                        }}
                      >
                        &#8226;
                      </span>
                    </div>
                    <div className={styles.icons}>
                      <Button
                        buttonType="ghost"
                        onClick={() => onReconnect(email.email)}
                      >
                        {emailConnectionMutator.isPending &&
                        emailConnectionMutator.variables === email.email
                          ? "Connecting..."
                          : "Retest"}
                      </Button>
                      <Button
                        buttonType="ghost"
                        onClick={() => setDeletingEmail(email.email)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </App>
  );
}

export default CalendarSettings;
