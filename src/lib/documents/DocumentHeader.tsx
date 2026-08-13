import { View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from './theme'
import { FSN_MARK } from '@/utils/brand'

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    marginRight: 8,
  },
  brandText: {
    justifyContent: 'center',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    color: PDF_COLORS.navy900,
  },
  companyTagline: {
    fontSize: 7.5,
    color: PDF_COLORS.steel500,
    marginTop: 1,
  },
  companyLine: {
    fontSize: 8,
    color: PDF_COLORS.steel500,
    textAlign: 'right',
    marginBottom: 1,
  },
  rule: {
    borderBottomWidth: 1.5,
    borderBottomColor: PDF_COLORS.navy700,
    marginBottom: 16,
  },
})

export interface DocumentCompanyInfo {
  company_name: string
  company_address?: string | null
  company_phone?: string | null
  company_email?: string | null
  company_website?: string | null
}

/** Shared brand header for every generated document — logo mark + company contact block. */
export function DocumentHeader({ company }: { company: DocumentCompanyInfo }) {
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.brandRow}>
          <Image style={styles.mark} src={FSN_MARK} />
          <View style={styles.brandText}>
            <Text style={styles.companyName}>{company.company_name}</Text>
            <Text style={styles.companyTagline}>Professional cargo &amp; logistics services</Text>
          </View>
        </View>
        <View>
          {company.company_address && <Text style={styles.companyLine}>{company.company_address}</Text>}
          {company.company_phone && <Text style={styles.companyLine}>{company.company_phone}</Text>}
          {company.company_email && <Text style={styles.companyLine}>{company.company_email}</Text>}
          {company.company_website && <Text style={styles.companyLine}>{company.company_website}</Text>}
        </View>
      </View>
      <View style={styles.rule} />
    </View>
  )
}
