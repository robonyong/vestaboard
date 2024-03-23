import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  CheckBox,
  Container,
  Input,
  Medium,
  Progress,
  Spacer,
  SubTitle,
  Title,
  Toast,
  colors,
} from "@vestaboard/installables";
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
        if (currValue.includes(day)) {
          return;
        }
        setValue(fieldName, [...currValue, day]);
      } else {
        if (!currValue.includes(day)) {
          return;
        }
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
    <App color={colors.shark}>
      <Container>
        <Toast
          severity={settingsMutator.isSuccess ? "success" : "error"}
          message={
            settingsMutator.isSuccess
              ? "Saved!"
              : `Failed to save: ${settingsMutator.error?.message}`
          }
          open={!settingsMutator.isIdle && !settingsMutator.isPending}
          onClose={() => settingsMutator.reset()}
        />
        <div className={styles.main}>
          <Title>Robin's Vestaboard Settings </Title>
          <Spacer size="large" />
          <SubTitle>Transit Schedules </SubTitle>
          <Controller
            control={control}
            render={({ field: { value } }) => (
              <CheckBox
                label="Enabled"
                checked={value}
                onValueChange={(newValue) =>
                  setValue("transitEnabled", newValue)
                }
              />
            )}
            name="transitEnabled"
          />
          <Spacer />
          <Controller
            control={control}
            render={({ field: { value } }) => (
              <Input
                disabled={!transitEnabled}
                type="time"
                label="Weekday Start Querying"
                value={value}
                onValueChange={(newValue) => setValue("transitStart", newValue)}
              />
            )}
            name="transitStart"
          />
          <Spacer size="medium" />
          <Controller
            control={control}
            render={({ field: { value } }) => (
              <Input
                disabled={!transitEnabled}
                type="time"
                label="Weekday Stop Querying"
                value={value}
                onValueChange={(newValue) => setValue("transitEnd", newValue)}
              />
            )}
            name="transitEnd"
          />
          <Spacer size="medium" />
          <Medium>Transit Days</Medium>
          <Controller
            control={control}
            name="transitDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!transitEnabled}
                label="Monday"
                checked={value.includes("1")}
                onValueChange={(selected) =>
                  onDayChange("1", selected, value, "transitDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="transitDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!transitEnabled}
                label="Tuesday"
                checked={value.includes("2")}
                onValueChange={(selected) =>
                  onDayChange("2", selected, value, "transitDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="transitDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!transitEnabled}
                label="Wednesday"
                checked={value.includes("3")}
                onValueChange={(selected) =>
                  onDayChange("3", selected, value, "transitDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="transitDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!transitEnabled}
                label="Thursday"
                checked={value.includes("4")}
                onValueChange={(selected) =>
                  onDayChange("4", selected, value, "transitDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="transitDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!transitEnabled}
                label="Friday"
                checked={value.includes("5")}
                onValueChange={(selected) =>
                  onDayChange("5", selected, value, "transitDays")
                }
              />
            )}
          />
          <SubTitle>Calendar Events</SubTitle>
          <Controller
            control={control}
            render={({ field: { value } }) => (
              <CheckBox
                label="Enabled"
                checked={value}
                onValueChange={(newValue) =>
                  setValue("calendarEnabled", newValue)
                }
              />
            )}
            name="calendarEnabled"
          />
          <Medium>Calendar Days</Medium>
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Monday"
                checked={value.includes("1")}
                onValueChange={(selected) =>
                  onDayChange("1", selected, value, "calendarDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Tuesday"
                checked={value.includes("2")}
                onValueChange={(selected) =>
                  onDayChange("2", selected, value, "calendarDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Wednesday"
                checked={value.includes("3")}
                onValueChange={(selected) =>
                  onDayChange("3", selected, value, "calendarDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Thursday"
                checked={value.includes("4")}
                onValueChange={(selected) =>
                  onDayChange("4", selected, value, "calendarDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Friday"
                checked={value.includes("5")}
                onValueChange={(selected) =>
                  onDayChange("5", selected, value, "calendarDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Saturday"
                checked={value.includes("6")}
                onValueChange={(selected) =>
                  onDayChange("6", selected, value, "calendarDays")
                }
              />
            )}
          />
          <Controller
            control={control}
            name="calendarDays"
            render={({ field: { value } }) => (
              <CheckBox
                disabled={!calendarEnabled}
                label="Sunday"
                checked={value.includes("0")}
                onValueChange={(selected) =>
                  onDayChange("0", selected, value, "calendarDays")
                }
              />
            )}
          />
          {/* <Spacer size="medium" /> */}
          {/* <SubTitle>Quinoa</SubTitle> */}
          {/* <Spacer />
          <Input
            type="date"
            label="Date Of Last Incident"
            value={lastCatIncidentDate}
            onValueChange={setDate}
          /> */}
          <Spacer size="large" />
          <Button
            disabled={settingsMutator.isPending}
            buttonType="primary"
            onClick={save}
          >
            {settingsMutator.isPending ? <Progress /> : "Save"}
          </Button>
        </div>
      </Container>
    </App>
  );
}

export default SubscriptionSetting;
