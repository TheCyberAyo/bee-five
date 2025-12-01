/**
 * Privacy Policy Component
 * Displays the privacy policy for Bee-Five app
 * Required for AdMob and app store approval
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const isMobile = SCREEN_WIDTH <= 768;

interface PrivacyPolicyProps {
  onBackToMenu: () => void;
}

export default function PrivacyPolicy({ onBackToMenu }: PrivacyPolicyProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const openURL = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Failed to open URL:', err)
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackToMenu}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.content}>
            {/* Introduction */}
            <Text style={styles.introText}>
              Bee-Five ("we", "our", or "us") operates the Bee-Five mobile
              application (the "Service"), developed by MindGrind. This page
              informs you of our policies regarding the collection, use, and
              disclosure of personal information when you use our Service.
            </Text>

            {/* Last Updated */}
            <Text style={styles.lastUpdated}>
              Last Updated: January 2025
            </Text>

            {/* Information We Collect */}
            <Text style={styles.sectionTitle}>Information We Collect</Text>
            <Text style={styles.sectionText}>
              We may collect the following types of information:
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Non-personal data:</Text> Device
              information, operating system, app version, and general usage
              statistics
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Account information:</Text> If you
              sign up for an account or multiplayer features, we may collect an
              email address for login and account management purposes
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Game progress:</Text> Local game
              progress and statistics stored on your device
            </Text>
            <Text style={styles.sectionText}>
              We do not collect sensitive personal information such as payment
              details, location data, or contact lists.
            </Text>

            {/* AdMob and Google Ads */}
            <Text style={styles.sectionTitle}>
              AdMob and Google Ads Usage
            </Text>
            <Text style={styles.sectionText}>
              Our app uses Google AdMob to display advertisements. AdMob may
              collect and use data to provide personalized ads and measure ad
              performance.
            </Text>
            <Text style={styles.subsectionTitle}>
              Data Collected by AdMob:
            </Text>
            <Text style={styles.bulletPoint}>
              • Device identifiers (such as Android Advertising ID or iOS
              Identifier for Advertisers)
            </Text>
            <Text style={styles.bulletPoint}>
              • IP address
            </Text>
            <Text style={styles.bulletPoint}>
              • App usage data and interactions with ads
            </Text>
            <Text style={styles.bulletPoint}>
              • Device information (model, OS version, language)
            </Text>
            <Text style={styles.sectionText}>
              This data is used to:
            </Text>
            <Text style={styles.bulletPoint}>
              • Show you relevant advertisements
            </Text>
            <Text style={styles.bulletPoint}>
              • Measure ad performance and effectiveness
            </Text>
            <Text style={styles.bulletPoint}>
              • Prevent fraud and abuse
            </Text>
            <Text style={styles.sectionText}>
              AdMob's use of information is governed by Google's Privacy Policy.
              You can learn more about how Google uses data at{' '}
              <Text
                style={styles.link}
                onPress={() =>
                  openURL('https://policies.google.com/privacy')
                }
              >
                policies.google.com/privacy
              </Text>
              .
            </Text>
            <Text style={styles.sectionText}>
              You can opt out of personalized advertising by visiting{' '}
              <Text
                style={styles.link}
                onPress={() =>
                  openURL('https://adssettings.google.com')
                }
              >
                adssettings.google.com
              </Text>
              .
            </Text>

            {/* Third-Party Services */}
            <Text style={styles.sectionTitle}>Third-Party Services</Text>
            <Text style={styles.sectionText}>
              Our app may use the following third-party services:
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Google AdMob:</Text> For displaying
              advertisements. See Google's Privacy Policy for details.
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Supabase:</Text> For backend services
              and data storage (if applicable). See Supabase's Privacy Policy
              for details.
            </Text>
            <Text style={styles.sectionText}>
              These services have their own privacy policies governing the
              collection and use of your information. We encourage you to
              review their privacy policies.
            </Text>

            {/* User Rights - GDPR & CCPA */}
            <Text style={styles.sectionTitle}>
              Your Rights (GDPR & CCPA)
            </Text>
            <Text style={styles.subsectionTitle}>
              If you are located in the European Economic Area (EEA) or
              California, you have the following rights:
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Right to Access:</Text> You can
              request a copy of the personal data we hold about you
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Right to Rectification:</Text> You can
              request correction of inaccurate personal data
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Right to Erasure:</Text> You can
              request deletion of your personal data
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Right to Data Portability:</Text> You
              can request your data in a portable format
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Right to Object:</Text> You can object
              to processing of your personal data
            </Text>
            <Text style={styles.bulletPoint}>
              • <Text style={styles.bold}>Right to Withdraw Consent:</Text> You
              can withdraw consent for data processing at any time
            </Text>
            <Text style={styles.sectionText}>
              To exercise these rights, please contact us using the information
              provided in the "Contact Us" section below.
            </Text>

            {/* Children's Privacy */}
            <Text style={styles.sectionTitle}>Children's Privacy</Text>
            <Text style={styles.sectionText}>
              Our Service is not intended for children under the age of 13. We
              do not knowingly collect personal information from children under
              13. If you are a parent or guardian and believe your child has
              provided us with personal information, please contact us
              immediately.
            </Text>
            <Text style={styles.sectionText}>
              If we discover that we have collected personal information from a
              child under 13, we will delete that information promptly.
            </Text>

            {/* Data Security */}
            <Text style={styles.sectionTitle}>Data Security</Text>
            <Text style={styles.sectionText}>
              We implement appropriate technical and organizational measures to
              protect your personal information. However, no method of
              transmission over the internet or electronic storage is 100% secure.
              While we strive to use commercially acceptable means to protect
              your data, we cannot guarantee absolute security.
            </Text>

            {/* Data Retention */}
            <Text style={styles.sectionTitle}>Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain your personal information only for as long as necessary
              to provide our Service and fulfill the purposes outlined in this
              Privacy Policy. When you request deletion of your data, we will
              delete it within 30 days, except where we are required to retain
              it by law.
            </Text>

            {/* Changes to Policy */}
            <Text style={styles.sectionTitle}>Changes to This Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on this
              page and updating the "Last Updated" date. You are advised to
              review this Privacy Policy periodically for any changes.
            </Text>

            {/* Contact Information */}
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have any questions about this Privacy Policy, wish to
              exercise your rights, or need to contact us regarding your
              personal data, please reach out to us:
            </Text>
            <View style={styles.contactBox}>
              <Text style={styles.contactText}>
                <Text style={styles.bold}>Email:</Text> admin@mindgrind.co.za
              </Text>
              <Text style={styles.contactText}>
                <Text style={styles.bold}>Developer:</Text> MindGrind
              </Text>
              <Text style={styles.contactText}>
                <Text style={styles.bold}>App:</Text> Bee-Five
              </Text>
            </View>
            <Text style={styles.sectionText}>
              We will respond to your inquiry within 30 days.
            </Text>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2025 Bee-Five. Product of MindGrind.
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFC30B',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FFC30B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: 'bold',
    color: '#FFC30B',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#666',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFC30B',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: isMobile ? 20 : 30,
  },
  content: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  introText: {
    color: '#ffffff',
    fontSize: isMobile ? 16 : 18,
    lineHeight: 26,
    marginBottom: 20,
    textAlign: 'left',
  },
  lastUpdated: {
    color: '#FFC30B',
    fontSize: isMobile ? 14 : 16,
    fontStyle: 'italic',
    marginBottom: 30,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#FFC30B',
    marginTop: 30,
    marginBottom: 15,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subsectionTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '600',
    color: '#FFC30B',
    marginTop: 15,
    marginBottom: 10,
  },
  sectionText: {
    color: '#ffffff',
    fontSize: isMobile ? 15 : 17,
    lineHeight: 24,
    marginBottom: 15,
    textAlign: 'left',
  },
  bulletPoint: {
    color: '#ffffff',
    fontSize: isMobile ? 15 : 17,
    lineHeight: 24,
    marginBottom: 10,
    marginLeft: 10,
    textAlign: 'left',
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFC30B',
  },
  link: {
    color: '#FFC30B',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  contactBox: {
    backgroundColor: 'rgba(255, 195, 11, 0.1)',
    borderWidth: 2,
    borderColor: '#FFC30B',
    borderRadius: 10,
    padding: 20,
    marginVertical: 15,
  },
  contactText: {
    color: '#ffffff',
    fontSize: isMobile ? 15 : 17,
    lineHeight: 26,
    marginBottom: 8,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 195, 11, 0.3)',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: isMobile ? 14 : 16,
    textAlign: 'center',
  },
});


