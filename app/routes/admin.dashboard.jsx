import { useState, useEffect } from "react";
import { useSearchParams } from "@remix-run/react";
import { Page, Layout, Card, Button, Banner, Stack, Text } from "@shopify/polaris";

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const shop = searchParams.get("shop");
  const installed = searchParams.get("installed");

  return (
    <Page
      title="BeninPay Dashboard"
      subtitle={`Boutique: ${shop || 'Non connectée'}`}
    >
      <Layout>
        {installed === 'true' && (
          <Layout.Section>
            <Banner status="success" title="Installation réussie!">
              BeninPay est maintenant installé sur votre boutique.
              Choisissez un plan pour commencer à accepter les paiements Mobile Money.
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <Card sectioned>
              <Stack vertical>
                <Text variant="headingMd" as="h2">💳 Paiements</Text>
                <Text>Transactions ce mois: <strong>0</strong></Text>
                <Text>Montant total: <strong>0 XOF</strong></Text>
                <Button>Voir les transactions</Button>
              </Stack>
            </Card>

            <Card sectioned>
              <Stack vertical>
                <Text variant="headingMd" as="h2">📊 Plan actuel</Text>
                <Text>Plan: <strong>Gratuit</strong></Text>
                <Text>10 transactions/mois</Text>
                <Button primary url="/admin/plans">Changer de plan</Button>
              </Stack>
            </Card>
          </div>
        </Layout.Section>

        <Layout.Section>
          <Card title="🚀 Prochaines étapes" sectioned>
            <Stack vertical spacing="loose">
              <div>
                <Text variant="headingSm" as="h3">1. Choisir un plan</Text>
                <Text>Sélectionnez le plan adapté à votre volume de transactions</Text>
                <Button url="/admin/plans">Voir les plans</Button>
              </div>

              <div>
                <Text variant="headingSm" as="h3">2. Configurer le paiement</Text>
                <Text>Ajoutez Mobile Money comme moyen de paiement dans Settings → Payments</Text>
              </div>

              <div>
                <Text variant="headingSm" as="h3">3. Tester</Text>
                <Text>Créez une commande test pour vérifier que tout fonctionne</Text>
              </div>
            </Stack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card title="📞 Support" sectioned>
            <Stack vertical>
              <Text>Besoin d'aide?</Text>
              <Text>📧 Email: wolim47@gmail.com</Text>
              <Text>📱 WhatsApp: +229 58 13 78 22</Text>
            </Stack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
