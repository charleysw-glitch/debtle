"""One-time bootstrap of the checked-in explicit counterpart code registry.
Review/edit data/creditor-classification.json for future datasets. The importer
never infers categories from numerical code ranges or names.
"""
import json
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[1]
COUNTRY_CODES='001 002 003 004 005 006 007 008 009 010 011 012 018 020 021 022 025 026 030 035 040 044 045 050 055 060 061 062 063 064 065 066 068 069 071 072 073 074 075 076 077 078 082 083 084 085 086 087 091 093 095 130 133 136 139 142 216 225 227 228 229 230 231 232 233 234 235 236 238 239 240 241 243 244 245 247 248 249 251 252 253 255 256 257 259 260 261 264 265 266 268 269 270 271 272 273 274 275 278 280 282 283 285 287 288 301 302 328 329 331 336 338 340 342 345 347 349 351 352 354 358 361 364 366 368 373 375 376 377 378 379 381 382 383 384 386 425 428 431 434 437 440 446 451 454 457 460 463 520 521 522 523 524 525 530 540 543 546 549 552 555 558 561 566 573 576 580 625 630 635 640 646 655 660 665 666 701 725 728 730 734 735 738 740 742 745 748 751 753 755 761 764 765 769 801 820 832 836 840 850 854 858 860 862 866 870 880'.split()
MULTILATERAL_CODES='019 237 802 803 804 806 807 808 809 810 811 812 813 814 815 816 817 877 878 887 888 890 892 893 895 898 899 901 902 903 904 905 906 909 910 911 913 915 917 918 919 920 921 924 925 926 927 931 932 933 940 942 947 948 950 951 952 953 957 958 959 960 961 963 964 966 967 969 970 971 973 974 975 976 977 978 979 980 983 987 988 990 991 992 993 997'.split()
DISPLAY={'005':'Germany','055':'Türkiye','087':'Russia','247':"Côte d’Ivoire",'540':'Iran','742':'South Korea','769':'Vietnam','901':'World Bank–IBRD','905':'World Bank–IDA','909':'Inter-American Development Bank','913':'African Development Bank','915':'Asian Development Bank','907':'IMF','988':'International Fund for Agricultural Development','920':'CAF – Development Bank of Latin America','815':'African Export-Import Bank','817':'Trade and Development Bank','951':'OPEC Fund','953':'BADEA','994':'Multiple Lenders','FCW':'Other Multiple Lenders'}

def build():
    w=openpyxl.load_workbook(next((ROOT/'data/source').glob('*.xlsx')),read_only=True,data_only=True)
    names={str(r[3]).strip():str(r[2]).strip() for r in w['Data'].values if r[5]=='DT.DOD.DPPG.CD' and r[3]!='WLD'}
    result={}
    for code,name in sorted(names.items()):
        category='bilateral' if code in COUNTRY_CODES else 'multilateral' if code in MULTILATERAL_CODES else 'imf' if code=='907' else 'private' if code=='BND' else 'other'
        note='Individual creditor country/territory (including historical sovereign counterparts).' if category=='bilateral' else 'Named international or regional institution.' if category=='multilateral' else 'IMF credit: use only DT.DOD.DIMF.US.CD / 907.' if category=='imf' else 'Identifiable private bondholder category.' if category=='private' else 'Unclassified or multiple-lender balance; source does not establish a more precise type.'
        result[code]={'name':DISPLAY.get(code,name),'sourceName':name,'type':category,'note':note}
    (ROOT/'data/creditor-classification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f'Wrote {len(result)} explicit counterpart mappings')
if __name__=='__main__':build()
