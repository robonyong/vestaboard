import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import styles from "../styles/Settings.module.css";

export interface Settings {
  id: string;
  transitStart: string;
  transitEnd: string;
  transitEnabled: boolean;
  calendarEnabled: boolean;
  transitDays: string[];
  calendarDays: string[];
  lastCatIncidentDate: string;
}

interface Props {
  settings: Settings;
}

const dayOptions = [
  ["1", "Monday"],
  ["2", "Tuesday"],
  ["3", "Wednesday"],
  ["4", "Thursday"],
  ["5", "Friday"],
] as const;

const calendarDayOptions = [
  ...dayOptions,
  ["6", "Saturday"],
  ["0", "Sunday"],
] as const;

function SubscriptionSetting({ settings }: Props) {
  const { control, handleSubmit, setValue, watch } = useForm({
    defaultValues: settings,
  });

  const [transitEnabled, calendarEnabled] = watch([
    "transitEnabled",
    "calendarEnabled",
  ]);

  const onDayChange = useCallback(
    (
      day: string,
      selected: boolean,
      currValue: string[],
      fieldName: "transitDays" | "calendarDays"
    ) => {
      if (selected) {
        if (!currValue.includes(day)) {
          setValue(fieldName, [...currValue, day]);
        }
        return;
      }

      if (currValue.includes(day)) {
        setValue(
          fieldName,
          currValue.filter((d) => d !== day)
        );
      }
    },
    [setValue]
  );

  const queryClient = useQueryClient();
  const settingsMutator = useMutation({
    mutationFn: async (data: Settings) => {
      const { id, ...restData } = data;
      const serializedData = {
        ...restData,
        transitDays: data.transitDays.join(","),
        calendarDays: data.calendarDays.join(","),
      };
      const res = await fetch(`/api/settings/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serializedData),
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
      queryClient.invalidateQueries({ queryKey: ["/settings", settings.id] });
    },
  });

  const save = handleSubmit(async (data) => {
    settingsMutator.mutate(data);
  });

  return (
    <Box className={styles.appShell}>
      <Container maxWidth="sm">
        <Snackbar
          open={!settingsMutator.isIdle && !settingsMutator.isPending}
          autoHideDuration={4000}
          onClose={() => settingsMutator.reset()}
        >
          <Alert
            severity={settingsMutator.isSuccess ? "success" : "error"}
            onClose={() => settingsMutator.reset()}
            variant="filled"
          >
            {settingsMutator.isSuccess
              ? "Saved!"
              : `Failed to save: ${settingsMutator.error?.message}`}
          </Alert>
        </Snackbar>
        <main className={styles.main}>
          <Typography variant="h4" component="h1" fontWeight={700}>
            Robin&apos;s Vestaboard Settings
          </Typography>

          <Stack spacing={2.5}>
            <Typography variant="h5" component="h2">
              Transit Schedules
            </Typography>
            <Controller
              control={control}
              name="transitEnabled"
              render={({ field: { value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value}
                      onChange={(_, checked) =>
                        setValue("transitEnabled", checked)
                      }
                    />
                  }
                  label="Enabled"
                />
              )}
            />
            <Controller
              control={control}
              name="transitStart"
              render={({ field: { value } }) => (
                <TextField
                  disabled={!transitEnabled}
                  type="time"
                  label="Weekday Start Querying"
                  value={value}
                  onChange={(event) =>
                    setValue("transitStart", event.target.value)
                  }
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              )}
            />
            <Controller
              control={control}
              name="transitEnd"
              render={({ field: { value } }) => (
                <TextField
                  disabled={!transitEnabled}
                  type="time"
                  label="Weekday Stop Querying"
                  value={value}
                  onChange={(event) => setValue("transitEnd", event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  fullWidth
                />
              )}
            />
            <Typography variant="subtitle1" fontWeight={700}>
              Transit Days
            </Typography>
            <Stack>
              {dayOptions.map(([day, label]) => (
                <Controller
                  key={day}
                  control={control}
                  name="transitDays"
                  render={({ field: { value } }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          disabled={!transitEnabled}
                          checked={value.includes(day)}
                          onChange={(_, selected) =>
                            onDayChange(day, selected, value, "transitDays")
                          }
                        />
                      }
                      label={label}
                    />
                  )}
                />
              ))}
            </Stack>
          </Stack>

          <Divider />

          <Stack spacing={2.5}>
            <Typography variant="h5" component="h2">
              Calendar Events
            </Typography>
            <Controller
              control={control}
              name="calendarEnabled"
              render={({ field: { value } }) => (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={value}
                      onChange={(_, checked) =>
                        setValue("calendarEnabled", checked)
                      }
                    />
                  }
                  label="Enabled"
                />
              )}
            />
            <Typography variant="subtitle1" fontWeight={700}>
              Calendar Days
            </Typography>
            <Stack>
              {calendarDayOptions.map(([day, label]) => (
                <Controller
                  key={day}
                  control={control}
                  name="calendarDays"
                  render={({ field: { value } }) => (
                    <FormControlLabel
                      control={
                        <Checkbox
                          disabled={!calendarEnabled}
                          checked={value.includes(day)}
                          onChange={(_, selected) =>
                            onDayChange(day, selected, value, "calendarDays")
                          }
                        />
                      }
                      label={label}
                    />
                  )}
                />
              ))}
            </Stack>
          </Stack>

          <Button
            disabled={settingsMutator.isPending}
            variant="contained"
            onClick={save}
            size="large"
          >
            {settingsMutator.isPending ? (
              <CircularProgress color="inherit" size={20} />
            ) : (
              "Save"
            )}
          </Button>
        </main>
      </Container>
    </Box>
  );
}

export default SubscriptionSetting;
