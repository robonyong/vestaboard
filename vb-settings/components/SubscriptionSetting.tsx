import {
  App,
  Button,
  CheckBox,
  Container,
  colors,
  Input,
  Progress,
  Spacer,
  SubTitle,
  Title,
  Toast,
} from "@vestaboard/installables";
import { useState } from "react";
import styles from "../styles/Settings.module.css";

type SaveState = {
  saving: boolean;
  error?: string;
  success?: boolean;
};

export type Settings = {
  id: string;
  transitStart: string;
  transitEnd: string;
  transitEnabled: boolean;
  calendarEnabled: boolean;
  lastCatIncidentDate: string;
};

const SubscriptionSetting: React.FC<Settings> = (props) => {
  const [transitStart, setTransitStart] = useState(props.transitStart);
  const [transitEnd, setTransitEnd] = useState(props.transitEnd);
  const [transitEnabled, setTransitEnabled] = useState(props.transitEnabled);
  const [calendarEnabled, setCalendarEnabled] = useState(props.calendarEnabled);
  // const [lastCatIncidentDate, setDate] = useState(props.lastCatIncidentDate);
  const [saveState, setSaveState] = useState<SaveState>({
    saving: false,
  });

  const save = async () => {
    setSaveState({ saving: true });
    const newBody = {
      transitStart,
      transitEnd,
      transitEnabled,
      calendarEnabled,
      // lastCatIncidentDate,
    };
    const res = await fetch(`/api/settings/${props.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newBody),
    });
    if (!res.ok) {
      let error = res.statusText;
      try {
        error = await res.text();
      } catch (err) {
        console.error("unable to process error message from server");
      }
      setSaveState({ saving: false, success: false, error });
      return;
    }
    setSaveState({ saving: false, success: true });
  };

  return (
    <App color={colors.shark}>
      <Container>
        <Toast
          severity={saveState.success ? "success" : "error"}
          message={
            saveState.success ? "Saved!" : `Failed to save: ${saveState?.error}`
          }
          open={!!saveState.success || !!saveState.error}
          onClose={() => setSaveState({ saving: false })}
        />
        <div className={styles.main}>
          <Title>Robin's Vestaboard Settings </Title>
          <Spacer size="large" />
          <SubTitle>Transit Schedules </SubTitle>
          <CheckBox
            label="Enabled"
            checked={transitEnabled}
            onValueChange={setTransitEnabled}
          />
          <Spacer />
          <Input
            disabled={!transitEnabled}
            type="time"
            label="Weekday Start Querying"
            value={transitStart}
            onValueChange={setTransitStart}
          />
          <Spacer size="medium" />
          <Input
            disabled={!transitEnabled}
            type="time"
            label="Weekday Stop Querying"
            value={transitEnd}
            onValueChange={setTransitEnd}
          />
          <Spacer size="medium" />
          <SubTitle>Calendar Events</SubTitle>
          <CheckBox
            label="Enabled"
            checked={calendarEnabled}
            onValueChange={setCalendarEnabled}
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
            disabled={saveState.saving}
            buttonType="primary"
            onClick={save}
          >
            {saveState.saving ? <Progress /> : "Save"}
          </Button>
        </div>
      </Container>
    </App>
  );
};

export default SubscriptionSetting;
