import { useState, useEffect } from "react";
import { Page, Layout, Card, Button, Badge, Stack, Text, List, Banner } from "@shopify/polaris";

export default function PlansPage() {
  const [plans, setPlans] = useState([]);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    try {
      const response = await fetch('/api/plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Erreur chargement plans:', error);
    }
  }

  async function subscribe(planId) {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/plans/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain: 'test-shop.myshopify.com', // TODO: Récupérer le vrai domain
          planId: planId
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentPlan(planId);
        setMessage({
          type: 'success',
          text: `✅ ${data.message}`
        });
      } else {
        setMessage({
          type: 'error',
          text: `❌ ${data.error}`
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Erreur: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  }

  function getPlanBadge(planId) {
    if (planId === currentPlan) {
      return <Badge status="success">Plan actuel</Badge>;
    }
    if (planId === 'basic') {
      return <Badge status="attention">Recommandé</Badge>;
    }
    return null;
  }

  return (
    <Page
      title="Plans BeninPay"
      subtitle="Choisissez le plan qui correspond à vos besoins"
    >
      <Layout>
        {message && (
          <Layout.Section>
            <Banner
              status={message.type === 'success' ? 'success' : 'critical'}
              onDismiss={() => setMessage(null)}
            >
              {message.text}
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {plans.map((plan) => (
              <Card
                key={plan.id}
                sectioned
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Text variant="headingLg" as="h2">{plan.name}</Text>
                    {getPlanBadge(plan.id)}
                  </div>
                }
              >
                <Stack vertical spacing="loose">
                  {/* Prix */}
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Text variant="heading2xl" as="h1">
                      {plan.price === 0 ? 'Gratuit' : `${plan.price.toLocaleString()} XOF`}
                    </Text>
                    {plan.price > 0 && (
                      <Text variant="bodySm" color="subdued">/mois</Text>
                    )}
                  </div>

                  {/* Description */}
                  <Text>{plan.description}</Text>

                  {/* Caractéristiques */}
                  <List type="bullet">
                    <List.Item>
                      {plan.features.maxTransactions === -1
                        ? '✨ Transactions illimitées'
                        : `${plan.features.maxTransactions} transactions/mois`}
                    </List.Item>
                    <List.Item>
                      Commission: {plan.features.commission}%
                    </List.Item>
                    <List.Item>
                      Opérateurs: {plan.features.operators.map(o => o.toUpperCase()).join(', ')}
                    </List.Item>
                    <List.Item>
                      Support: {plan.features.support}
                    </List.Item>
                    {plan.features.webhooks && (
                      <List.Item>✅ Webhooks temps réel</List.Item>
                    )}
                    {plan.features.customBranding && (
                      <List.Item>✅ Branding personnalisé</List.Item>
                    )}
                    {plan.features.analytics && (
                      <List.Item>✅ Analytics avancées</List.Item>
                    )}
                    {plan.features.apiAccess && (
                      <List.Item>✅ Accès API complet</List.Item>
                    )}
                  </List>

                  {/* Bouton */}
                  <Button
                    primary={plan.recommended}
                    fullWidth
                    disabled={plan.id === currentPlan}
                    loading={loading}
                    onClick={() => subscribe(plan.id)}
                  >
                    {plan.id === currentPlan ? 'Plan actuel' : `Choisir ${plan.name}`}
                  </Button>
                </Stack>
              </Card>
            ))}
          </div>
        </Layout.Section>

        <Layout.Section>
          <Card title="📊 Votre utilisation" sectioned>
            <Stack vertical>
              <Text>Plan actuel: <strong>{currentPlan.toUpperCase()}</strong></Text>
              <Text>Transactions ce mois: <strong>0 / {
                plans.find(p => p.id === currentPlan)?.features.maxTransactions === -1
                  ? '∞'
                  : plans.find(p => p.id === currentPlan)?.features.maxTransactions || 0
              }</strong></Text>
              <Text>Prochaine facturation: <strong>16 juillet 2026</strong></Text>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card title="💡 Besoin d'aide?" sectioned>
            <Stack vertical>
              <Text>
                Vous avez des questions sur nos plans? Contactez-nous:
              </Text>
              <Text>
                📧 Email: support@beninpay.com<br/>
                📱 WhatsApp: +229 58 13 78 22
              </Text>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
