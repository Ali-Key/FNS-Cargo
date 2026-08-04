import { View, Text, Svg, Path, Circle, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from './theme'

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
    borderRadius: 6,
    backgroundColor: PDF_COLORS.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
    color: PDF_COLORS.navy900,
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
          <View style={styles.mark}>
            <Svg viewBox="0 0 24 24" width={16} height={16}>
              <Path
                d="M3 16.5 9 12l4 3 8-6.5"
                stroke={PDF_COLORS.white}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <Circle cx={21} cy={8.5} r={1.8} fill={PDF_COLORS.white} />
            </Svg>
          </View>
          <Text style={styles.companyName}>{company.company_name}</Text>
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
