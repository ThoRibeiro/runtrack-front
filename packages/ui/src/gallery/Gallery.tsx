import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { ThemeProvider, useTheme, type ThemeName } from '../theme';
import { space } from '../tokens';
import {
  Avatar,
  Badge,
  BarSeries,
  Button,
  Card,
  Checkbox,
  Chip,
  EmptyState,
  ErrorState,
  FloatingIconButton,
  FormField,
  GroupedRows,
  Icon,
  IconAction,
  Input,
  MetricCard,
  Modal,
  ProgressRing,
  RadioGroup,
  SectionHeader,
  Select,
  Sheet,
  Skeleton,
  Sparkline,
  Spinner,
  StatTile,
  Switch,
  TabBar,
  Tabs,
  Text,
  TextArea,
  iconNames,
} from '../components';

/**
 * The gallery §3 asks for: every component, every state, including the ugly
 * ones — long text, error, loading, disabled — and the three themes side by
 * side, because a component is only finished when it survives all three.
 *
 * It is a screen rather than a Storybook: one dependency fewer, it runs on the
 * three targets exactly as the application does, and the accessibility tests
 * can mount it as-is.
 */
const LONG =
  'Un libellé délibérément beaucoup trop long pour la place qu’on lui laisse, parce que c’est ce qui casse une mise en page';

const PACE = [312, 305, 318, 296, 301, 288, 294, 290];
const WEEK = [4.2, 0, 8.1, 6.4, 0, 12.5, 5.2];

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <View style={{ gap: space.sm }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

function Body(): ReactNode {
  const theme = useTheme();
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(false);
  const [radio, setRadio] = useState<'public' | 'followers' | 'private'>('followers');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [tab, setTab] = useState('home');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colours.canvas }}
      contentContainerStyle={{ padding: space.md, gap: space.xl }}
      testID="gallery-scroll"
    >
      <Section title="Boutons">
        <View style={{ gap: space.xs }}>
          <Button label="Démarrer une course" onPress={() => undefined} />
          <Button label="Partager" variant="outline" icon="share" onPress={() => undefined} />
          <Button label="Voir tout" variant="ghost" onPress={() => undefined} />
          <Button label="Supprimer la course" variant="danger" onPress={() => undefined} />
          <Button label="Enregistrement" loading onPress={() => undefined} />
          <Button label="Indisponible" disabled onPress={() => undefined} />
          <Button label={LONG} variant="outline" onPress={() => undefined} />
          <Button label="Petit" size="sm" onPress={() => undefined} />
          <Button label="Grand, pleine largeur" size="lg" fullWidth onPress={() => undefined} />
        </View>
      </Section>

      <Section title="Carte d’accroche">
        <Card tone="brand">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <ProgressRing progress={0.68} label="Objectif de la semaine" />
            <View style={{ flex: 1, gap: space.xxs }}>
              <Text variant="section">Objectif de la semaine</Text>
              <Text tone="muted">27,2 km sur 40 km</Text>
              <Text tone="brand" variant="caption">
                Plus que 12,8 km
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title="Cartes-métriques">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard
              title="Fréquence cardiaque"
              value="76"
              unit="bpm"
              spokenUnit="battements par minute"
              status="Stable"
              icon="heart"
              accent="heart"
              chart={<Sparkline values={PACE} width={120} height={32} />}
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard
              title="Allure moyenne"
              value="5:12"
              unit="/km"
              spokenUnit="minutes par kilomètre"
              status="Meilleure que la semaine dernière"
              icon="trending-up"
              accent="pace"
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard
              title="Dénivelé"
              value="284"
              unit="m"
              spokenUnit="mètres"
              icon="mountain"
              accent="climb"
              chart={<BarSeries values={WEEK} width={120} height={32} />}
            />
          </View>
          <View style={{ flexGrow: 1, flexBasis: '46%' }}>
            <MetricCard title={LONG} value="12,4" unit="km" icon="activity" />
          </View>
        </View>
      </Section>

      <Section title="Rangée d’actions">
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <IconAction icon="live" label="En direct" active onPress={() => undefined} />
            <IconAction icon="share" label="Partager" onPress={() => undefined} />
            <IconAction icon="download" label="Hors-ligne" onPress={() => undefined} />
            <IconAction icon="bookmark" label="Enregistrer" disabled />
          </View>
        </Card>
      </Section>

      <Section title="Statistiques d’une course">
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg }}>
            <StatTile label="Distance" value="12,4" unit="km" spokenUnit="kilomètres" />
            <StatTile label="Durée" value="1:04:22" />
            <StatTile label="Allure" value="5:12" unit="/km" />
            <StatTile label="D+" value="284" unit="m" spokenUnit="mètres" />
          </View>
        </Card>
      </Section>

      <Section title="Formulaire">
        <View style={{ gap: space.md }}>
          <FormField label="Adresse e-mail" required>
            {(field) => (
              <Input field={field} defaultValue="" placeholder="vous@exemple.fr" icon="user" />
            )}
          </FormField>
          <FormField label="Mot de passe" error="Il manque au moins huit caractères">
            {(field) => <Input field={field} defaultValue="abc" secureTextEntry />}
          </FormField>
          <FormField label="Commentaire" hint="Visible par les personnes qui vous suivent">
            {(field) => <TextArea field={field} defaultValue={LONG} />}
          </FormField>
          <FormField label="Visibilité par défaut">
            {(field) => (
              <RadioGroup
                field={field}
                options={[
                  { value: 'public', label: 'Publique' },
                  { value: 'followers', label: 'Mes abonnés' },
                  { value: 'private', label: 'Privée' },
                ]}
                value={radio}
                onValueChange={setRadio}
              />
            )}
          </FormField>
          <FormField label="Type d’activité">
            {(field) => (
              <Select
                field={field}
                defaultValue="run"
                options={[
                  { value: 'run', label: 'Course à pied' },
                  { value: 'trail', label: 'Trail' },
                  { value: 'treadmill', label: 'Tapis de course' },
                ]}
              />
            )}
          </FormField>
          <FormField label="Heures calmes" hint="Aucune notification pendant cette plage">
            {(field) => <Switch field={field} value={switched} onValueChange={setSwitched} />}
          </FormField>
          <FormField label="Accepter les conditions" error="À cocher pour continuer">
            {(field) => <Checkbox field={field} value={checked} onValueChange={setChecked} />}
          </FormField>
        </View>
      </Section>

      <Section title="Navigation">
        <View style={{ gap: space.sm }}>
          <Tabs
            label="Période"
            options={[
              { value: 'week', label: 'Semaine' },
              { value: 'month', label: 'Mois' },
              { value: 'year', label: 'Année' },
            ]}
            value={period}
            onValueChange={setPeriod}
          />
          <TabBar
            items={[
              { key: 'home', icon: 'home', label: 'Accueil' },
              { key: 'feed', icon: 'users', label: 'Fil' },
              { key: 'notifications', icon: 'bell', label: 'Alertes', badgeCount: 12 },
              { key: 'profile', icon: 'user', label: 'Profil' },
            ]}
            activeKey={tab}
            onSelect={setTab}
          />
        </View>
      </Section>

      <Section title="Lignes groupées">
        <GroupedRows
          rows={[
            { key: 'units', label: 'Unités', value: 'Métriques', onPress: () => undefined },
            { key: 'zone', label: 'Fuseau horaire', value: 'Europe/Paris' },
            { key: 'long', label: LONG, value: 'Oui', onPress: () => undefined },
          ]}
        />
      </Section>

      <Section title="Identité et compteurs">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          <Avatar name="Thomas Ribeiro" size="lg" />
          <Avatar name="Camille" size="md" />
          <Avatar name="A" size="sm" />
          <Badge count={3} label="notifications non lues" />
          <Badge count={128} label="notifications non lues" />
          <Chip label="Trail" icon="mountain" />
          <Chip label="En direct" icon="live" selected onPress={() => undefined} />
        </View>
      </Section>

      <Section title="Attente, vide, erreur">
        <View style={{ gap: space.sm }}>
          <Card>
            <View style={{ gap: space.xs }}>
              <Skeleton width="60%" height={20} />
              <Skeleton width="100%" height={14} />
              <Skeleton width="80%" height={14} />
            </View>
          </Card>
          <Spinner label="Chargement du fil" visibleLabel />
          <EmptyState
            title="Aucune course pour l’instant"
            description="Votre première sortie apparaîtra ici."
            actionLabel="Comment démarrer"
            onAction={() => undefined}
          />
          <ErrorState
            title="Course introuvable"
            message="Elle a été supprimée, ou son partage a été retiré."
            correlationId="7c1f4a2e-9b33"
            onRetry={() => undefined}
          />
        </View>
      </Section>

      <Section title="Superpositions">
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button
            label="Ouvrir le panneau"
            variant="outline"
            onPress={() => {
              setSheetOpen(true);
            }}
          />
          <Button
            label="Ouvrir la modale"
            variant="outline"
            onPress={() => {
              setModalOpen(true);
            }}
          />
          <FloatingIconButton icon="arrow-left" accessibilityLabel="Retour" />
          <FloatingIconButton icon="more-horizontal" accessibilityLabel="Plus d’options" />
        </View>
      </Section>

      <Section title="Jeu d’icônes">
        <Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
            {iconNames.map((name) => (
              <Icon key={name} name={name} colour={theme.colours.text} />
            ))}
          </View>
        </Card>
      </Section>

      <Sheet
        visible={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
        }}
        title="Panneau glissant"
        detents={[0.35, 0.8]}
      >
        <Text tone="muted">
          Relâche-le à mi-course : il finit dans le sens du poignet, pas vers le point le plus
          proche.
        </Text>
      </Sheet>

      <Modal
        visible={modalOpen}
        onClose={() => {
          setModalOpen(false);
        }}
        title="Supprimer cette course ?"
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => {
          setModalOpen(false);
        }}
      >
        <Text tone="muted">Cette action est définitive.</Text>
      </Modal>
    </ScrollView>
  );
}

export function Gallery(): ReactNode {
  const [name, setName] = useState<ThemeName>('light');

  return (
    <ThemeProvider name={name}>
      <View style={{ flex: 1 }}>
        <View style={{ padding: space.sm }}>
          <Tabs
            label="Thème"
            options={[
              { value: 'light', label: 'Clair' },
              { value: 'dark', label: 'Sombre' },
              { value: 'run', label: 'Course' },
            ]}
            value={name}
            onValueChange={setName}
          />
        </View>
        <Body />
      </View>
    </ThemeProvider>
  );
}
